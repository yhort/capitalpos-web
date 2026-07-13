import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfiguracionFiscalApiService } from '../../data-access/configuracion-fiscal-api.service';
import {
  ConfiguracionFiscalEmpresa,
  GuardarConfiguracionFiscalEmpresaRequest,
} from '../../models/configuracion-fiscal-empresa.model';

type ConfiguracionEstado = 'cargando' | 'listo' | 'guardando' | 'error';

@Component({
  selector: 'app-configuracion-page',
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion-page.component.html',
  styleUrl: './configuracion-page.component.scss',
})
export class ConfiguracionPageComponent implements OnInit {
  private readonly configuracionFiscalApi = inject(ConfiguracionFiscalApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<ConfiguracionEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly configuracion = signal<ConfiguracionFiscalEmpresa | null>(null);

  protected readonly configuracionForm = this.formBuilder.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
    nombreComercial: ['', Validators.maxLength(200)],
    ubigeo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
    departamento: ['', [Validators.required, Validators.maxLength(100)]],
    provincia: ['', [Validators.required, Validators.maxLength(100)]],
    distrito: ['', [Validators.required, Validators.maxLength(100)]],
    activa: [true],
  });

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  protected cargarConfiguracion(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.estado.set('cargando');
    this.mensaje.set('');

    this.configuracionFiscalApi.obtenerConfiguracion().subscribe({
      next: (configuracion) => {
        this.configuracion.set(configuracion);
        this.llenarFormulario(configuracion);
        this.estado.set('listo');
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.configuracion.set(null);
          this.configuracionForm.reset({
            ruc: '',
            razonSocial: '',
            nombreComercial: '',
            ubigeo: '',
            direccion: '',
            departamento: '',
            provincia: '',
            distrito: '',
            activa: true,
          });
          this.estado.set('listo');
          this.mensaje.set('La empresa activa aun no tiene configuracion fiscal. Completa el formulario para crearla.');
          return;
        }

        this.estado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo cargar la configuracion fiscal.'));
      },
    });
  }

  protected guardarConfiguracion(): void {
    if (this.estado() === 'guardando') {
      return;
    }

    this.configuracionForm.markAllAsTouched();

    if (this.configuracionForm.invalid) {
      this.mensaje.set('Revisa los datos fiscales antes de guardar.');
      return;
    }

    const request = this.construirGuardarRequest();
    this.estado.set('guardando');
    this.mensaje.set('');

    this.configuracionFiscalApi.guardarConfiguracion(request).subscribe({
      next: (configuracion) => {
        this.configuracion.set(configuracion);
        this.llenarFormulario(configuracion);
        this.estado.set('listo');
        this.mensaje.set('Configuracion fiscal guardada correctamente.');
      },
      error: (error: unknown) => {
        this.estado.set('listo');
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo guardar la configuracion fiscal.'));
      },
    });
  }

  private llenarFormulario(configuracion: ConfiguracionFiscalEmpresa): void {
    this.configuracionForm.reset({
      ruc: configuracion.ruc,
      razonSocial: configuracion.razonSocial,
      nombreComercial: configuracion.nombreComercial,
      ubigeo: configuracion.ubigeo,
      direccion: configuracion.direccion,
      departamento: configuracion.departamento,
      provincia: configuracion.provincia,
      distrito: configuracion.distrito,
      activa: configuracion.activa,
    });
  }

  private construirGuardarRequest(): GuardarConfiguracionFiscalEmpresaRequest {
    const form = this.configuracionForm.getRawValue();

    return {
      ruc: form.ruc.trim(),
      razonSocial: form.razonSocial.trim(),
      nombreComercial: normalizarTextoNullable(form.nombreComercial),
      ubigeo: form.ubigeo.trim(),
      direccion: form.direccion.trim(),
      departamento: form.departamento.trim(),
      provincia: form.provincia.trim(),
      distrito: form.distrito.trim(),
      activa: form.activa,
    };
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.extraerMensajeApi(error);

      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No se pudo conectar con capitalpos-api.';
      }

      if (error.status === 403) {
        return 'No tienes permisos para gestionar la configuracion fiscal.';
      }

      if (error.status === 400) {
        return 'Revisa los datos fiscales enviados.';
      }
    }

    return fallback;
  }

  private extraerMensajeApi(error: HttpErrorResponse): string {
    const body = error.error;

    if (typeof body === 'object' && body !== null) {
      const message = 'message' in body ? body.message : 'mensaje' in body ? body.mensaje : null;
      return typeof message === 'string' ? message : '';
    }

    return '';
  }
}

function normalizarTextoNullable(valor: string): string | null {
  const texto = valor.trim();
  return texto.length > 0 ? texto : null;
}
