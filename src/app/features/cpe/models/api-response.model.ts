export interface ApiResponse<T> {
  readonly ok: boolean;
  readonly mensaje: string;
  readonly data: T | null;
  readonly errores: readonly string[];
}
