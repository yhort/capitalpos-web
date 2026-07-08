import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly empresaActivaService = inject(EmpresaActivaService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly mensajeError = signal(this.obtenerMensajeInicial());
  protected readonly loginForm = this.formBuilder.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    empresaId: [this.empresaActivaService.empresaId() ?? '', Validators.required],
  });

  protected puedeEnviar(): boolean {
    return this.loginForm.valid && !this.enviando();
  }

  protected iniciarSesion(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.mensajeError.set('');

    const { correo, password, empresaId } = this.loginForm.getRawValue();

    this.authService.login({ correo, password }).subscribe({
      next: () => {
        this.empresaActivaService.establecerEmpresaActiva(empresaId);
        this.router.navigateByUrl(this.obtenerReturnUrl());
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.mensajeError.set(this.obtenerMensajeError(error));
      },
    });
  }

  private obtenerReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/app') ? returnUrl : '/app/dashboard';
  }

  private obtenerMensajeInicial(): string {
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error === 'unauthorized') {
      return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
    }

    if (error === 'forbidden') {
      return 'No tienes permisos para completar la operación solicitada.';
    }

    return '';
  }

  private obtenerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con capitalpos-api.';
      }

      if (error.status === 401) {
        return 'Las credenciales son inválidas o el acceso no está disponible.';
      }

      if (error.status === 403) {
        return 'No tienes permisos para iniciar sesión.';
      }
    }

    return 'No se pudo iniciar sesión. Revisa tus datos e intenta nuevamente.';
  }
}
