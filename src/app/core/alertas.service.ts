import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from './api.config';
import { Alerta, AlertaRequest, EstadoAlerta } from './models';

/** ms-alertas (8081): alertas del usuario autenticado (el backend lo saca del JWT). */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);

  listar(estado?: EstadoAlerta): Observable<Alerta[]> {
    const params: Record<string, string> = estado ? { estado } : {};
    return this.http.get<Alerta[]>(`${API.alertas}/alertas`, { params });
  }

  crear(alerta: AlertaRequest): Observable<Alerta> {
    return this.http.post<Alerta>(`${API.alertas}/alertas`, alerta);
  }

  cancelar(id: number): Observable<void> {
    return this.http.delete<void>(`${API.alertas}/alertas/${id}`);
  }
}
