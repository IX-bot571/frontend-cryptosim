import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { AlertasService } from '../../core/alertas.service';
import { mensajeError } from '../../core/errores';
import { Alerta } from '../../core/models';
import { condicion } from '../../shared/formato';
import { PrecioPipe } from '../../shared/formato.pipes';

/** Historial de alertas disparadas, con refresco periódico; las nuevas desde que se abrió la pantalla se resaltan. */
@Component({
  selector: 'app-notificaciones',
  imports: [DatePipe, PrecioPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notificaciones.html',
})
export class Notificaciones {
  private readonly alertasApi = inject(AlertasService);

  protected readonly disparadas = signal<Alerta[] | null>(null);
  protected readonly nuevas = signal<ReadonlySet<number>>(new Set());
  protected readonly error = signal<string | null>(null);
  protected readonly condicion = condicion;

  protected readonly ordenadas = computed(() =>
    [...(this.disparadas() ?? [])].sort((a, b) => (b.disparadaEn ?? '').localeCompare(a.disparadaEn ?? '')),
  );

  constructor() {
    timer(0, 5000)
      .pipe(
        switchMap(() =>
          this.alertasApi.listar('DISPARADA').pipe(
            catchError((e) => {
              this.error.set(mensajeError(e, 'ms-alertas (8081)'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.recibir(lista));
  }

  private recibir(lista: Alerta[]): void {
    this.error.set(null);
    const previas = this.disparadas();
    if (previas !== null) {
      const conocidas = new Set(previas.map((a) => a.id));
      const llegadas = lista.filter((a) => !conocidas.has(a.id)).map((a) => a.id);
      if (llegadas.length > 0) {
        this.nuevas.update((n) => new Set([...n, ...llegadas]));
      }
    }
    this.disparadas.set(lista);
  }
}
