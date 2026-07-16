import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ReportesApiService } from '../../data-access/reportes-api.service';
import { ReporteVentasPorCanalResponse } from '../../models/reporte-ventas-por-canal.model';

type ReporteEstado = 'cargando' | 'listo' | 'sin-datos' | 'error';

@Component({
  selector: 'app-ventas-por-canal-page',
  imports: [DecimalPipe, ReactiveFormsModule],
  templateUrl: './ventas-por-canal-page.component.html',
  styleUrl: './ventas-por-canal-page.component.scss',
})
export class VentasPorCanalPageComponent implements OnInit {
  private readonly reportesApi = inject(ReportesApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly estado = signal<ReporteEstado>('cargando');
  protected readonly mensaje = signal('');
  protected readonly reporte = signal<ReporteVentasPorCanalResponse | null>(null);

  protected readonly filtrosForm = this.formBuilder.nonNullable.group({
    desde: [obtenerPrimerDiaMesActualLima(), Validators.required],
    hasta: [obtenerFechaActualLima(), Validators.required],
  });

  ngOnInit(): void {
    this.consultar();
  }

  protected consultar(): void {
    this.filtrosForm.markAllAsTouched();

    if (this.filtrosForm.invalid) {
      this.estado.set('error');
      this.mensaje.set('Selecciona un rango de fechas valido.');
      return;
    }

    const { desde, hasta } = this.filtrosForm.getRawValue();

    this.estado.set('cargando');
    this.mensaje.set('');
    this.reportesApi.obtenerVentasPorCanal(desde, hasta).subscribe({
      next: (response) => {
        this.reporte.set(response);
        this.estado.set(response.items.length === 0 ? 'sin-datos' : 'listo');
        this.mensaje.set(response.items.length === 0 ? 'No hay ventas por canal en el rango seleccionado.' : '');
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.mensaje.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected formatearSoles(valor: number): string {
    return formatearSoles(valor);
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = extraerMensajeApi(error);

      if (apiMessage) {
        return apiMessage;
      }

      if (error.status === 0) {
        return 'No se pudo conectar con capitalpos-api.';
      }

      if (error.status === 403) {
        return 'No tienes permisos suficientes para consultar reportes.';
      }

      if (error.status === 400) {
        return 'Revisa el rango de fechas e intenta nuevamente.';
      }
    }

    return 'No se pudo cargar el reporte de ventas por canal.';
  }
}

export function obtenerFechaActualLima(fecha = new Date()): string {
  return obtenerPartesFechaLima(fecha).fecha;
}

export function obtenerPrimerDiaMesActualLima(fecha = new Date()): string {
  const partes = obtenerPartesFechaLima(fecha);
  return `${partes.year}-${partes.month}-01`;
}

export function formatearSoles(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor).replace(/^S\/\s?/, 'S/ ');
}

function obtenerPartesFechaLima(fecha: Date): { readonly fecha: string; readonly year: string; readonly month: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const year = partes.find((parte) => parte.type === 'year')?.value ?? '';
  const month = partes.find((parte) => parte.type === 'month')?.value ?? '';
  const day = partes.find((parte) => parte.type === 'day')?.value ?? '';

  return {
    fecha: `${year}-${month}-${day}`,
    year,
    month,
  };
}

function extraerMensajeApi(error: HttpErrorResponse): string {
  const body = error.error;

  if (typeof body === 'object' && body !== null) {
    const message = 'message' in body ? body.message : 'mensaje' in body ? body.mensaje : null;
    return typeof message === 'string' ? message : '';
  }

  return '';
}
