import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { CPE_EMISOR_TEMPORAL_CONFIG } from '../../config/cpe-emisor.config';
import { CpeApiService } from '../../data-access/cpe-api.service';
import { CpeHealthResponse } from '../../models/cpe-health-response.model';
import { EmitirCpeRequest, ItemCpe } from '../../models/emitir-cpe-request.model';

type ConexionCpeEstado = 'comprobando' | 'conectado' | 'error';
type CodigoAfectacionIgv = '10' | '20' | '30';
type RequestValidacionEstado = 'sin-validar' | 'valido' | 'invalido';

interface TotalesCpeCalculados {
  readonly totalGravada: number;
  readonly totalExonerada: number;
  readonly totalInafecta: number;
  readonly totalIgv: number;
  readonly total: number;
}

interface ItemCpeFormValue {
  readonly codigo: string;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
  readonly valorUnitario: number;
  readonly codigoAfectacionIgv: CodigoAfectacionIgv;
  readonly precioUnitario: number;
  readonly subtotal: number;
  readonly igv: number;
  readonly total: number;
}

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
  protected readonly estadoConexion = signal<ConexionCpeEstado>('comprobando');
  protected readonly health = signal<CpeHealthResponse | null>(null);
  protected readonly mensajeError = signal('');
  protected readonly totales = signal<TotalesCpeCalculados>(TOTALES_INICIALES);
  protected readonly requestPreview = signal<string | null>(null);
  protected readonly requestValidacionEstado = signal<RequestValidacionEstado>('sin-validar');
  protected readonly requestValidacionErrores = signal<readonly string[]>([]);
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

  protected get items() {
    return this.emitirForm.controls.items;
  }

  ngOnInit(): void {
    this.verificarConexion();
    this.emitirForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.recalcularImportes();
        this.limpiarValidacionRequest();
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

  protected generarVistaPrevia(): void {
    this.emitirForm.markAllAsTouched();

    if (this.emitirForm.invalid) {
      this.limpiarValidacionRequest();
      return;
    }

    const request = this.construirEmitirCpeRequest();
    const errores = this.validarEmitirCpeRequest(request);

    this.requestValidacionErrores.set(errores);
    this.requestValidacionEstado.set(errores.length === 0 ? 'valido' : 'invalido');
    this.requestPreview.set(errores.length === 0 ? JSON.stringify(request, null, 2) : null);
  }

  private verificarConexion(): void {
    this.estadoConexion.set('comprobando');
    this.mensajeError.set('');

    this.cpeApiService.verificarConexion().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.health.set(response.data);
        this.estadoConexion.set(response.ok && response.data ? 'conectado' : 'error');

        if (!response.ok || !response.data) {
          this.mensajeError.set(response.mensaje || 'La API CPE no devolvió datos de estado.');
        }
      },
      error: (error: unknown) => {
        this.health.set(null);
        this.estadoConexion.set('error');
        this.mensajeError.set(this.obtenerMensajeError(error));
      }
    });
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con la API CPE. Revisa que el backend y el proxy estén levantados.';
      }

      if (error.status === 401) {
        return 'La API rechazó la solicitud por autenticación.';
      }

      return `La API CPE respondió con estado HTTP ${error.status}.`;
    }

    return 'Ocurrió un error inesperado al comprobar la conexión.';
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

  private construirEmitirCpeRequest(): EmitirCpeRequest {
    const comprobante = this.emitirForm.controls.comprobante.getRawValue();
    const cliente = this.emitirForm.controls.cliente.getRawValue();
    const totales = this.totales();

    return {
      rucEmisor: CPE_EMISOR_TEMPORAL_CONFIG.ruc,
      emisor: CPE_EMISOR_TEMPORAL_CONFIG,
      tipoComprobante: comprobante.tipoComprobante,
      serie: comprobante.serie.toUpperCase(),
      correlativo: comprobante.correlativo,
      fechaEmision: new Date(`${comprobante.fechaEmision}T00:00:00`).toISOString(),
      moneda: comprobante.moneda,
      tipoOperacion: comprobante.tipoOperacion,
      observacion: comprobante.observacion.trim() || null,
      formaPago: 'CONTADO',
      montoPendientePago: 0,
      cuotas: [],
      cliente: {
        tipoDocumento: cliente.tipoDocumento,
        numeroDocumento: cliente.numeroDocumento,
        razonSocial: cliente.razonSocial,
      },
      items: this.items.controls.map((item) => this.mapearItem(item.getRawValue())),
      totalGravada: totales.totalGravada,
      totalExonerada: totales.totalExonerada,
      totalInafecta: totales.totalInafecta,
      totalIgv: totales.totalIgv,
      total: totales.total,
      montoEnLetras: '',
    };
  }

  private mapearItem(item: ItemCpeFormValue): ItemCpe {
    return {
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidadMedida: item.unidadMedida,
      cantidad: item.cantidad,
      valorUnitario: item.valorUnitario,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      igv: item.igv,
      total: item.total,
      codigoAfectacionIgv: item.codigoAfectacionIgv,
    };
  }

  private validarEmitirCpeRequest(request: EmitirCpeRequest): readonly string[] {
    const errores: string[] = [];

    if (!request.rucEmisor || request.rucEmisor !== request.emisor.ruc) {
      errores.push('El RUC principal del emisor debe coincidir con emisor.ruc.');
    }

    if (request.tipoComprobante !== '01' && request.tipoComprobante !== '03') {
      errores.push('El tipo de comprobante debe ser 01 Factura o 03 Boleta.');
    }

    if (request.tipoComprobante === '01' && !request.serie.toUpperCase().startsWith('F')) {
      errores.push('Para factura, la serie debe comenzar con F.');
    }

    if (request.tipoComprobante === '03' && !request.serie.toUpperCase().startsWith('B')) {
      errores.push('Para boleta, la serie debe comenzar con B.');
    }

    if (request.correlativo <= 0) {
      errores.push('El correlativo debe ser mayor a 0.');
    }

    if (!this.clienteEsValidoParaComprobante(request)) {
      errores.push('El cliente no cumple las reglas del tipo de comprobante.');
    }

    if (request.items.length === 0) {
      errores.push('El comprobante debe tener al menos un ítem.');
    }

    for (const [index, item] of request.items.entries()) {
      const numeroItem = index + 1;

      if (item.cantidad <= 0) {
        errores.push(`El ítem ${numeroItem} debe tener cantidad mayor a 0.`);
      }

      if (
        item.valorUnitario < 0 ||
        item.precioUnitario < 0 ||
        item.subtotal < 0 ||
        item.igv < 0 ||
        item.total < 0
      ) {
        errores.push(`El ítem ${numeroItem} contiene importes negativos.`);
      }
    }

    const sumaTotales = this.redondear(
      request.totalGravada + request.totalExonerada + request.totalInafecta + request.totalIgv
    );

    if (!this.montosCoinciden(sumaTotales, request.total)) {
      errores.push('El total no coincide con gravada + exonerada + inafecta + IGV.');
    }

    const totalItems = this.redondear(request.items.reduce((total, item) => total + item.total, 0));

    if (!this.montosCoinciden(totalItems, request.total)) {
      errores.push('La suma de los totales de ítems no coincide con el total general.');
    }

    if (request.formaPago !== 'CONTADO') {
      errores.push('La forma de pago debe ser CONTADO en esta versión.');
    }

    if (request.cuotas.length > 0) {
      errores.push('Las cuotas deben estar vacías cuando la forma de pago es CONTADO.');
    }

    return errores;
  }

  private recalcularImportes(): void {
    const nuevosTotales = { ...TOTALES_INICIALES };

    for (const item of this.items.controls) {
      const cantidad = this.obtenerNumero(item.controls.cantidad.value);
      const valorUnitario = this.obtenerNumero(item.controls.valorUnitario.value);
      const codigoAfectacionIgv = item.controls.codigoAfectacionIgv.value;
      const subtotal = this.redondear(cantidad * valorUnitario);
      const igv = codigoAfectacionIgv === '10' ? this.redondear(subtotal * IGV_GRAVADO) : 0;
      const totalItem = this.redondear(subtotal + igv);
      const precioUnitario = cantidad > 0 ? this.redondear(totalItem / cantidad) : 0;

      item.patchValue({
        precioUnitario,
        subtotal,
        igv,
        total: totalItem,
      }, { emitEvent: false });

      if (codigoAfectacionIgv === '10') {
        nuevosTotales.totalGravada = this.redondear(nuevosTotales.totalGravada + subtotal);
      }

      if (codigoAfectacionIgv === '20') {
        nuevosTotales.totalExonerada = this.redondear(nuevosTotales.totalExonerada + subtotal);
      }

      if (codigoAfectacionIgv === '30') {
        nuevosTotales.totalInafecta = this.redondear(nuevosTotales.totalInafecta + subtotal);
      }

      nuevosTotales.totalIgv = this.redondear(nuevosTotales.totalIgv + igv);
      nuevosTotales.total = this.redondear(nuevosTotales.total + totalItem);
    }

    this.totales.set(nuevosTotales);
  }

  private obtenerNumero(valor: number): number {
    return Number.isFinite(valor) ? valor : 0;
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  private montosCoinciden(izquierda: number, derecha: number): boolean {
    return Math.abs(izquierda - derecha) <= 0.01;
  }

  private clienteEsValidoParaComprobante(request: EmitirCpeRequest): boolean {
    const { tipoDocumento, numeroDocumento } = request.cliente;

    if (request.tipoComprobante === '01') {
      return tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento);
    }

    if (request.tipoComprobante === '03') {
      return (
        (tipoDocumento === '1' && /^\d{8}$/.test(numeroDocumento)) ||
        (tipoDocumento === '6' && /^\d{11}$/.test(numeroDocumento))
      );
    }

    return false;
  }

  private limpiarValidacionRequest(): void {
    this.requestPreview.set(null);
    this.requestValidacionEstado.set('sin-validar');
    this.requestValidacionErrores.set([]);
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
