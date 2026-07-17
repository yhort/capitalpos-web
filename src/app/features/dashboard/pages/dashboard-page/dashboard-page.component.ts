import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardApiService } from '../../data-access/dashboard-api.service';
import {
  DashboardComercialResponse,
  DashboardComercialStockBajoItem,
  DashboardComercialTopProducto,
} from '../../models/dashboard-comercial.model';

type DashboardEstado = 'cargando' | 'listo' | 'sin-ventas' | 'error';

@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<DashboardEstado>('listo');
  protected readonly mensaje = signal('');
  protected readonly dashboard = signal<DashboardComercialResponse | null>(null);

  ngOnInit(): void {
    this.cargarDashboard();
  }

  protected cargarDashboard(): void {
    if (this.estado() === 'cargando') {
      return;
    }

    this.estado.set('cargando');
    this.mensaje.set('');
    this.dashboardApi.obtenerDashboardComercial().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response) => {
        this.dashboard.set(response);
        this.estado.set(tieneVentas(response) ? 'listo' : 'sin-ventas');
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

  protected formatearFecha(fecha: string | null): string {
    return formatearFechaDashboard(fecha, false);
  }

  protected formatearFechaHora(fecha: string | null): string {
    return formatearFechaDashboard(fecha, true);
  }

  protected describirVariante(item: DashboardComercialTopProducto | DashboardComercialStockBajoItem): string {
    return describirVariante(item);
  }

  protected calcularBarraTopProducto(
    item: DashboardComercialTopProducto,
    productos: readonly DashboardComercialTopProducto[],
  ): number {
    return calcularBarraTopProducto(item, productos);
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
        return 'No tienes permisos suficientes para consultar el dashboard comercial.';
      }
    }

    return 'No se pudo cargar el dashboard comercial.';
  }
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

export function formatearFechaDashboard(fecha: string | null, incluirHora: boolean): string {
  if (!fecha) {
    return 'Sin fecha';
  }

  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

  if (soloFecha && !incluirHora) {
    return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(incluirHora
      ? {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }
      : {}),
  }).format(date).replace(',', '').replace(/\u00a0/g, ' ').replace(/\s0(\d:)/, ' $1');
}

export function describirVariante(
  item: Pick<DashboardComercialTopProducto | DashboardComercialStockBajoItem, 'talla' | 'color'>,
): string {
  const partes = [item.color, item.talla].filter((valor): valor is string => Boolean(valor));

  return partes.length > 0 ? partes.join(' / ') : 'Sin variante';
}

export function calcularBarraTopProducto(
  item: DashboardComercialTopProducto,
  productos: readonly DashboardComercialTopProducto[],
): number {
  const maxUnidades = Math.max(...productos.map((producto) => producto.unidades));

  if (!Number.isFinite(item.unidades) || !Number.isFinite(maxUnidades) || item.unidades <= 0 || maxUnidades <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((item.unidades / maxUnidades) * 1000) / 10));
}

function tieneVentas(response: DashboardComercialResponse): boolean {
  return response.resumen.importeTotalVendido > 0 ||
    response.resumen.cantidadOperaciones > 0 ||
    response.resumen.unidadesVendidas > 0;
}

function extraerMensajeApi(error: HttpErrorResponse): string {
  const body = error.error;

  if (typeof body === 'object' && body !== null) {
    const message = 'message' in body ? body.message : 'mensaje' in body ? body.mensaje : null;
    return typeof message === 'string' ? message : '';
  }

  return '';
}
