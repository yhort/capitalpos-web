import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';

import { CpeApiService } from '../../data-access/cpe-api.service';
import { CpeHealthResponse } from '../../models/cpe-health-response.model';
import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

type ConexionCpeEstado = 'comprobando' | 'conectado' | 'error';

@Component({
  selector: 'app-emitir-cpe-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Emitir CPE"
      description="Pantalla base para la futura emisión de comprobantes electrónicos."
    />

    <section aria-labelledby="conexion-cpe-title">
      <h2 id="conexion-cpe-title">Conexión con API CPE</h2>

      @if (estadoConexion() === 'comprobando') {
        <p>comprobando</p>
      }

      @if (estadoConexion() === 'conectado') {
        <p>conectado</p>

        @if (health(); as api) {
          <dl>
            <dt>Servicio</dt>
            <dd>{{ api.service }}</dd>
            <dt>Versión</dt>
            <dd>{{ api.version }}</dd>
            <dt>Modo</dt>
            <dd>{{ api.modo }}</dd>
            <dt>Servidor</dt>
            <dd>{{ api.fechaServidor }}</dd>
          </dl>
        }
      }

      @if (estadoConexion() === 'error') {
        <p>error</p>
        <p>{{ mensajeError() }}</p>
      }
    </section>
  `,
})
export class EmitirCpePageComponent implements OnInit {
  protected readonly estadoConexion = signal<ConexionCpeEstado>('comprobando');
  protected readonly health = signal<CpeHealthResponse | null>(null);
  protected readonly mensajeError = signal('');

  private readonly cpeApiService = inject(CpeApiService);

  ngOnInit(): void {
    this.verificarConexion();
  }

  private verificarConexion(): void {
    this.estadoConexion.set('comprobando');
    this.mensajeError.set('');

    this.cpeApiService.verificarConexion().subscribe({
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
}
