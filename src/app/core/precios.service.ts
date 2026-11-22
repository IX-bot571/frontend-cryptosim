import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from './api.config';
import { Cripto, Precio, PuntoHistorial } from './models';

/** ms-precios (8084): catálogo, últimos precios e historial en memoria. */
@Injectable({ providedIn: 'root' })
export class PreciosService {
  private readonly http = inject(HttpClient);

  catalogo(): Observable<Cripto[]> {
    return this.http.get<Cripto[]>(`${API.precios}/catalogo`);
  }

  precios(): Observable<Precio[]> {
    return this.http.get<Precio[]>(`${API.precios}/precios`);
  }

  historial(simbolo: string, minutos = 60): Observable<PuntoHistorial[]> {
    return this.http.get<PuntoHistorial[]>(`${API.precios}/precios/${simbolo}/historial`, {
      params: { minutos },
    });
  }
}
