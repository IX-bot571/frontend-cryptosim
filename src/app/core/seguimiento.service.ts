import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API } from './api.config';

/** ms-alertas (8081): lista de criptos que sigue el usuario. */
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<string[]> {
    return this.http
      .get<{ simbolos: string[] }>(`${API.alertas}/seguimiento`)
      .pipe(map((r) => r.simbolos));
  }

  reemplazar(simbolos: string[]): Observable<string[]> {
    return this.http
      .put<{ simbolos: string[] }>(`${API.alertas}/seguimiento`, { simbolos })
      .pipe(map((r) => r.simbolos));
  }
}
