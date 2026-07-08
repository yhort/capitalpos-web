import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EmpresaActivaService {
  private readonly storageKey = 'capitalpos.empresa.activa.id';
  private readonly empresaIdState = signal<string | null>(this.leerEmpresaIdGuardada());

  readonly empresaId = this.empresaIdState.asReadonly();

  establecerEmpresaActiva(empresaId: string): void {
    const valorNormalizado = empresaId.trim();

    if (!valorNormalizado) {
      this.limpiarEmpresaActiva();
      return;
    }

    this.empresaIdState.set(valorNormalizado);
    localStorage.setItem(this.storageKey, valorNormalizado);
  }

  limpiarEmpresaActiva(): void {
    this.empresaIdState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private leerEmpresaIdGuardada(): string | null {
    const empresaId = localStorage.getItem(this.storageKey)?.trim();
    return empresaId || null;
  }
}
