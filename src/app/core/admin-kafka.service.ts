import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API } from './api.config';
import { CrearTopicRequest, GrupoDetalle, GrupoResumen, TopicDetalle, TopicResumen } from './models';

/** ms-admin-kafka (8085): tópicos, configs, particiones y consumer groups. */
@Injectable({ providedIn: 'root' })
export class AdminKafkaService {
  private readonly http = inject(HttpClient);
  private readonly base = API.adminKafka;

  topicos(): Observable<TopicResumen[]> {
    return this.http.get<TopicResumen[]>(`${this.base}/topics`);
  }

  topico(nombre: string): Observable<TopicDetalle> {
    return this.http.get<TopicDetalle>(`${this.base}/topics/${encodeURIComponent(nombre)}`);
  }

  crear(req: CrearTopicRequest): Observable<TopicResumen> {
    return this.http.post<TopicResumen>(`${this.base}/topics`, req);
  }

  cambiarConfigs(nombre: string, configs: Record<string, string>): Observable<TopicDetalle> {
    return this.http.put<TopicDetalle>(`${this.base}/topics/${encodeURIComponent(nombre)}/config`, { configs });
  }

  aumentarParticiones(nombre: string, particiones: number): Observable<TopicDetalle> {
    return this.http.put<TopicDetalle>(`${this.base}/topics/${encodeURIComponent(nombre)}/partitions`, { particiones });
  }

  eliminar(nombre: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/topics/${encodeURIComponent(nombre)}`);
  }

  grupos(): Observable<GrupoResumen[]> {
    return this.http.get<GrupoResumen[]>(`${this.base}/consumer-groups`);
  }

  grupo(id: string): Observable<GrupoDetalle> {
    return this.http.get<GrupoDetalle>(`${this.base}/consumer-groups/${encodeURIComponent(id)}`);
  }
}
