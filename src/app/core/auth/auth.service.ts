import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { AuthSession, crearAuthSession } from './auth-session.model';
import { LoginRequest } from './login-request.model';
import { LoginResponse } from './login-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'capitalpos.auth.session';
  private readonly sessionState = signal<AuthSession | null>(this.leerSessionGuardada());

  readonly session = this.sessionState.asReadonly();
  readonly usuario = computed(() => this.sessionState()?.usuario ?? null);
  readonly estaAutenticado = computed(() => {
    const session = this.sessionState();
    return session ? this.sessionEsVigente(session) : false;
  });

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
      tap((response) => {
        this.guardarSession(crearAuthSession(response));
      }),
    );
  }

  logout(): void {
    this.sessionState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  obtenerAuthorizationHeader(): string | null {
    const session = this.sessionState();

    if (!session) {
      return null;
    }

    if (!this.sessionEsVigente(session)) {
      this.logout();
      return null;
    }

    const tokenType = session.tokenType || 'Bearer';
    return `${tokenType} ${session.accessToken}`;
  }

  private guardarSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private leerSessionGuardada(): AuthSession | null {
    const rawSession = localStorage.getItem(this.storageKey);

    if (!rawSession) {
      return null;
    }

    try {
      const session = JSON.parse(rawSession) as AuthSession;
      return session.accessToken ? session : null;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private sessionEsVigente(session: AuthSession): boolean {
    const expiresAt = Date.parse(session.expiresAtUtc);

    if (!Number.isFinite(expiresAt)) {
      return true;
    }

    const clockSkewMs = 30_000;
    return expiresAt - clockSkewMs > Date.now();
  }
}
