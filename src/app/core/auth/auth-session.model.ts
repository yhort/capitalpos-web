import { LoginResponse, UsuarioAutenticado } from './login-response.model';

export interface AuthSession {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly expiresAtUtc: string;
  readonly usuario: UsuarioAutenticado;
}

export function crearAuthSession(response: LoginResponse): AuthSession {
  return {
    accessToken: response.accessToken,
    tokenType: response.tokenType || 'Bearer',
    expiresIn: response.expiresIn,
    expiresAtUtc: response.expiresAtUtc,
    usuario: response.usuario,
  };
}
