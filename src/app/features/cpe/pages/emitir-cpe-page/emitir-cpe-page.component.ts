import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { AuthService } from '../../../../core/auth/auth.service';
import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { CPE_EMISOR_TEMPORAL_CONFIG } from '../../config/cpe-emisor.config';
import { CpeApiService } from '../../data-access/cpe-api.service';
import { CpeEmisionResponse } from '../../models/cpe-emision-response.model';
import { CpeEstadoResponse } from '../../models/cpe-estado-response.model';
import { EmitirCpeRequest } from '../../models/emitir-cpe-request.model';
import {
  CodigoAfectacionIgv,
  TotalesCpeCalculados,
  construirEmitirCpeRequest,
  redondearImporteCpe,
} from '../../utils/emitir-cpe-request.mapper';
import { validarEmitirCpeRequest } from '../../utils/emitir-cpe-request.validator';

type ConexionCpeEstado =
  | 'cargando'
  | 'conectado'
  | 'no-disponible'
  | 'no-autorizado'
  | 'respuesta-invalida'
  | 'error';
type RequestValidacionEstado = 'sin-validar' | 'valido' | 'invalido';
type EmisionCpeEstado = 'sin-emitir' | 'enviando' | 'exito' | 'rechazo' | 'error-validacion' | 'error';

const IGV_GRAVADO = 0.18;
const TOTALES_INICIALES: TotalesCpeCalculados = {
  totalGravada: 0,
  totalExonerada: 0,
  totalInafecta: 0,
  totalIgv: 0,
  total: 0,
};

@Component({
  selector: 'app-emitir-cpe-page',
  imports: [ReactiveFormsModule],
  templateUrl: './emitir-cpe-page.component.html',
  styleUrl: './emitir-cpe-page.component.scss',
})
export class EmitirCpePageComponent implements OnInit {
  protected readonly estadoConexion = signal<ConexionCpeEstado>('cargando');
  protected readonly estadoCpe = signal<CpeEstadoResponse | null>(null);
  protected readonly conexionMensaje = signal('');
  protected readonly conexionErrores = signal<readonly string[]>([]);
  protected readonly totales = signal<TotalesCpeCalculados>(TOTALES_INICIALES);
  protected readonly requestPreview = signal<string | null>(null);
  protected readonly requestValidacionEstado = signal<RequestValidacionEstado>('sin-validar');
  protected readonly requestValidacionErrores = signal<readonly string[]>([]);
  protected readonly emisionEstado = signal<EmisionCpeEstado>('sin-emitir');
  protected readonly emisionMensaje = signal('');
  protected readonly emisionRespuesta = signal<CpeEmisionResponse | null>(null);
  protected readonly emisionErrores = signal<readonly string[]>([]);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly emitirForm = this.formBuilder.group({
    comprobante: this.formBuilder.group({
      tipoComprobante: ['03', Validators.required],
      serie: ['B001', [Validators.required, Validators.pattern(/^[FB][A-Z0-9]{3}$/)]],
      correlativo: [1, [Validators.required, Validators.min(1)]],
      fechaEmision: [this.obtenerFechaActual(), Validators.required],
      moneda: ['PEN', Validators.required],
      tipoOperacion: ['0101', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]],
      formaPago: ['CONTADO', Validators.required],
      observacion: [''],
    }),
    cliente: this.formBuilder.group({
      tipoDocumento: ['1', Validators.required],
      numeroDocumento: ['', [Validators.required, Validators.pattern(/^\d{8,11}$/)]],
      razonSocial: ['', Validators.required],
    }),
    items: this.formBuilder.array([
      this.crearItemForm()
    ])
  }, {
    validators: this.validarFormularioCpe
  });

  private readonly cpeApiService = inject(CpeApiService);
  private readonly authService = inject(AuthService);
  private readonly empresaActivaService = inject(EmpresaActivaService);

  protected get items() {
    return this.emitirForm.controls.items;
  }

  ngOnInit(): void {
    this.obtenerEstadoCpe();
    this.emitirForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalcularImportes();
        this.limpiarValidacionRequest();
        this.limpiarResultadoEmision();
      });
    this.recalcularImportes();
  }

  protected agregarItem(): void {
    this.items.push(this.crearItemForm());
    this.recalcularImportes();
  }

  protected eliminarItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }

    this.items.removeAt(index);
    this.recalcularImportes();
  }

  protected marcarFormulario(): void {
    this.emitirForm.markAllAsTouched();
  }

  protected emitirCpe(): void {
    this.emitirForm.markAllAsTouched();
    this.limpiarResultadoEmision();

    const request = this.prepararRequestParaEmision();

    if (!request) {
      return;
    }

    this.emisionEstado.set('enviando');
    this.emisionMensaje.set('Enviando comprobante a capitalpos-api...');

    this.cpeApiService.emitirCpe(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const data = response.data;

        if (!data) {
          this.emisionEstado.set('error');
          this.emisionMensaje.set(response.mensaje || 'capitalpos-api no devolvió datos de emisión.');
          this.emisionErrores.set(response.errores ?? []);
          return;
        }

        this.emisionRespuesta.set(data);
        this.emisionErrores.set(data.errores ?? response.errores ?? []);
        this.emisionMensaje.set(data.mensaje || response.mensaje || 'Emisión procesada.');
        this.emisionEstado.set(this.clasificarEmision(response.ok, data));
      },
      error: (error: unknown) => {
        this.emisionEstado.set(this.obtenerEstadoErrorHttp(error));
        this.emisionMensaje.set(this.obtenerMensajeEmisionError(error));
        this.emisionErrores.set(this.obtenerErroresHttp(error));
      },
    });
  }

  protected generarVistaPrevia(): void {
    this.emitirForm.markAllAsTouched();

    if (this.emitirForm.invalid) {
      this.limpiarValidacionRequest();
      return;
    }

    const request = this.construirRequest();
    const errores = validarEmitirCpeRequest(request);

    this.requestValidacionErrores.set(errores);
    this.requestValidacionEstado.set(errores.length === 0 ? 'valido' : 'invalido');
    this.requestPreview.set(errores.length === 0 ? JSON.stringify(request, null, 2) : null);
  }

  private obtenerEstadoCpe(): void {
    this.estadoConexion.set('cargando');
    this.estadoCpe.set(null);
    this.conexionMensaje.set('');
    this.conexionErrores.set([]);

    this.cpeApiService.obtenerEstadoCpe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (!this.respuestaEstadoCpeEsValida(response)) {
          this.estadoConexion.set('respuesta-invalida');
          this.conexionMensaje.set('capitalpos-api devolvió una respuesta de estado CPE inválida.');
          return;
        }

        this.estadoCpe.set(response);
        this.conexionMensaje.set(response.mensaje);
        this.conexionErrores.set(this.filtrarErroresSeguros(response.errores));
        this.estadoConexion.set(response.ok && response.estado === 'OK' ? 'conectado' : 'no-disponible');
      },
      error: (error: unknown) => {
        this.estadoCpe.set(null);
        this.conexionErrores.set([]);
        this.estadoConexion.set(this.obtenerEstadoConexionError(error));
        this.conexionMensaje.set(this.obtenerMensajeConexionError(error));
      }
    });
  }

  private obtenerEstadoConexionError(error: unknown): ConexionCpeEstado {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'no-autorizado';
      }

      if (error.status === 0 || error.status === 503) {
        return 'no-disponible';
      }
    }

    return 'error';
  }

  private obtenerMensajeConexionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo consultar el estado CPE desde capitalpos-api.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'No autorizado o configuración de acceso incorrecta para consultar el estado CPE.';
      }

      if (error.status === 503) {
        return 'La integración CPE no está disponible en este momento.';
      }
    }

    return 'Ocurrió un error inesperado al consultar el estado CPE.';
  }

  private respuestaEstadoCpeEsValida(response: CpeEstadoResponse): boolean {
    return (
      typeof response?.ok === 'boolean' &&
      typeof response.estado === 'string' &&
      typeof response.mensaje === 'string' &&
      typeof response.servicio === 'string' &&
      typeof response.version === 'string' &&
      typeof response.modo === 'string' &&
      typeof response.simularGeneracionXml === 'boolean' &&
      typeof response.simularFirma === 'boolean' &&
      typeof response.simularEnvioSunat === 'boolean' &&
      Array.isArray(response.errores)
    );
  }

  private filtrarErroresSeguros(errores: readonly string[]): readonly string[] {
    return errores.filter((error): error is string => typeof error === 'string' && error.trim().length > 0);
  }

  private prepararRequestParaEmision(): EmitirCpeRequest | null {
    if (!this.authService.estaAutenticado()) {
      this.emisionEstado.set('error');
      this.emisionMensaje.set('Inicia sesión antes de emitir.');
      return null;
    }

    if (!this.empresaActivaService.empresaId()) {
      this.emisionEstado.set('error-validacion');
      this.emisionMensaje.set('Selecciona una empresa antes de emitir.');
      return null;
    }

    if (this.emitirForm.invalid) {
      this.emisionEstado.set('error-validacion');
      this.emisionMensaje.set('Completa los datos obligatorios antes de emitir.');
      return null;
    }

    if (!this.items.length || this.items.controls.some((item) => item.invalid)) {
      this.emisionEstado.set('error-validacion');
      this.emisionMensaje.set('Agrega al menos un ítem válido antes de emitir.');
      return null;
    }

    const request = this.construirRequest();
    const errores = validarEmitirCpeRequest(request);

    this.requestValidacionErrores.set(errores);
    this.requestValidacionEstado.set(errores.length === 0 ? 'valido' : 'invalido');

    if (errores.length > 0) {
      this.emisionEstado.set('error-validacion');
      this.emisionMensaje.set('El request CPE contiene errores de validación.');
      this.emisionErrores.set(errores);
      return null;
    }

    return request;
  }

  private construirRequest(): EmitirCpeRequest {
    return construirEmitirCpeRequest({
      comprobante: this.emitirForm.controls.comprobante.getRawValue(),
      cliente: this.emitirForm.controls.cliente.getRawValue(),
      items: this.items.controls.map((item) => item.getRawValue()),
      totales: this.totales(),
      emisor: CPE_EMISOR_TEMPORAL_CONFIG,
    });
  }

  private clasificarEmision(apiOk: boolean, data: CpeEmisionResponse): EmisionCpeEstado {
    if (data.estado === 'ERROR_VALIDACION') {
      return 'error-validacion';
    }

    if (!apiOk || !data.ok || data.estado === 'RECHAZADO') {
      return 'rechazo';
    }

    if (data.estado === 'ACEPTADO' || data.estado === 'SIMULADO') {
      return 'exito';
    }

    return 'error';
  }

  private obtenerEstadoErrorHttp(error: unknown): EmisionCpeEstado {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'error-validacion';
    }

    return 'error';
  }

  private obtenerMensajeEmisionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.extraerMensajeApi(error);

      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No se pudo conectar con capitalpos-api.';
      }

      if (error.status === 400) {
        return 'capitalpos-api rechazó la solicitud por validación.';
      }

      if (error.status === 401) {
        return 'La sesión no es válida o expiró.';
      }

      if (error.status === 403) {
        return 'No tienes permisos para emitir CPE con la empresa activa.';
      }

      return `capitalpos-api respondió con estado HTTP ${error.status}.`;
    }

    return 'Ocurrió un error inesperado al emitir el CPE.';
  }

  private obtenerErroresHttp(error: unknown): readonly string[] {
    if (!(error instanceof HttpErrorResponse)) {
      return [];
    }

    const errores = error.error?.errores;

    if (Array.isArray(errores)) {
      return errores.filter((item): item is string => typeof item === 'string');
    }

    return [];
  }

  private extraerMensajeApi(error: HttpErrorResponse): string {
    const message = error.error?.message ?? error.error?.mensaje;
    return typeof message === 'string' ? message : '';
  }

  private crearItemForm() {
    return this.formBuilder.group({
      codigo: [''],
      descripcion: ['', Validators.required],
      unidadMedida: ['NIU', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      valorUnitario: [0, [Validators.required, Validators.min(0)]],
      codigoAfectacionIgv: ['10' as CodigoAfectacionIgv, Validators.required],
      precioUnitario: [0],
      subtotal: [0],
      igv: [0],
      total: [0],
    });
  }

  private recalcularImportes(): void {
    const nuevosTotales = { ...TOTALES_INICIALES };

    for (const item of this.items.controls) {
      const cantidad = this.obtenerNumero(item.controls.cantidad.value);
      const valorUnitario = this.obtenerNumero(item.controls.valorUnitario.value);
      const codigoAfectacionIgv = item.controls.codigoAfectacionIgv.value;
      const subtotal = redondearImporteCpe(cantidad * valorUnitario);
      const igv = codigoAfectacionIgv === '10' ? redondearImporteCpe(subtotal * IGV_GRAVADO) : 0;
      const totalItem = redondearImporteCpe(subtotal + igv);
      const precioUnitario = cantidad > 0 ? redondearImporteCpe(totalItem / cantidad) : 0;

      item.patchValue({
        precioUnitario,
        subtotal,
        igv,
        total: totalItem,
      }, { emitEvent: false });

      if (codigoAfectacionIgv === '10') {
        nuevosTotales.totalGravada = redondearImporteCpe(nuevosTotales.totalGravada + subtotal);
      }

      if (codigoAfectacionIgv === '20') {
        nuevosTotales.totalExonerada = redondearImporteCpe(nuevosTotales.totalExonerada + subtotal);
      }

      if (codigoAfectacionIgv === '30') {
        nuevosTotales.totalInafecta = redondearImporteCpe(nuevosTotales.totalInafecta + subtotal);
      }

      nuevosTotales.totalIgv = redondearImporteCpe(nuevosTotales.totalIgv + igv);
      nuevosTotales.total = redondearImporteCpe(nuevosTotales.total + totalItem);
    }

    this.totales.set(nuevosTotales);
  }

  private obtenerNumero(valor: number): number {
    return Number.isFinite(valor) ? valor : 0;
  }

  private limpiarValidacionRequest(): void {
    this.requestPreview.set(null);
    this.requestValidacionEstado.set('sin-validar');
    this.requestValidacionErrores.set([]);
  }

  private limpiarResultadoEmision(): void {
    this.emisionEstado.set('sin-emitir');
    this.emisionMensaje.set('');
    this.emisionRespuesta.set(null);
    this.emisionErrores.set([]);
  }

  private validarFormularioCpe(control: AbstractControl): ValidationErrors | null {
    const tipoComprobante = control.get('comprobante.tipoComprobante')?.value;
    const serie = String(control.get('comprobante.serie')?.value ?? '').toUpperCase();
    const tipoDocumento = control.get('cliente.tipoDocumento')?.value;
    const numeroDocumento = String(control.get('cliente.numeroDocumento')?.value ?? '');
    const errores: ValidationErrors = {};

    if (tipoComprobante === '01' && !serie.startsWith('F')) {
      errores['serieFactura'] = true;
    }

    if (tipoComprobante === '03' && !serie.startsWith('B')) {
      errores['serieBoleta'] = true;
    }

    if (tipoComprobante === '01') {
      if (tipoDocumento !== '6' || !/^\d{11}$/.test(numeroDocumento)) {
        errores['facturaRequiereRuc'] = true;
      }
    }

    if (tipoComprobante === '03') {
      const dniValido = tipoDocumento === '1' && /^\d{8}$/.test(numeroDocumento);
      const rucValido = tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento);
      if (!dniValido && !rucValido) {
        errores['boletaDocumentoInvalido'] = true;
      }
    }

    return Object.keys(errores).length > 0 ? errores : null;
  }

  private obtenerFechaActual(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
