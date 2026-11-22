import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje legible para mostrar en pantalla (nunca una pantalla en blanco). */
export function mensajeError(err: unknown, servicio: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return `No se pudo conectar con ${servicio}. Revisa que esté levantado; se reintentará automáticamente.`;
    }
    const detalle = typeof err.error?.error === 'string' ? err.error.error : err.statusText;
    return `${servicio} respondió ${err.status}: ${detalle}`;
  }
  return `Error inesperado en ${servicio}.`;
}
