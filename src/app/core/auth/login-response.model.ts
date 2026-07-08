export interface LoginResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly expiresAtUtc: string;
  readonly usuario: UsuarioAutenticado;
}

export interface UsuarioAutenticado {
  readonly id: string;
  readonly correo: string;
}
