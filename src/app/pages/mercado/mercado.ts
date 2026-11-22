import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, forkJoin, of, switchMap, timer } from 'rxjs';
import { mensajeError } from '../../core/errores';
import { Precio, PuntoHistorial } from '../../core/models';
import { PreciosService } from '../../core/precios.service';
import { SeguimientoService } from '../../core/seguimiento.service';
import { CompactoPipe, PorcentajePipe, PrecioPipe } from '../../shared/formato.pipes';
import { Sparkline } from '../../shared/sparkline';

const INTERVALO_MS = 5000;
const MAX_PUNTOS = 720; // 1 h a 5 s por punto

/** Tarjetas de las criptos seguidas. Precios cada 5 s; el historial se carga una vez y se extiende en memoria. */
@Component({
  selector: 'app-mercado',
  imports: [RouterLink, Sparkline, PrecioPipe, PorcentajePipe, CompactoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mercado.html',
})
export class Mercado {
  private readonly preciosApi = inject(PreciosService);
  private readonly seguimientoApi = inject(SeguimientoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly seguidos = signal<string[] | null>(null);
  protected readonly nombres = signal<Record<string, string>>({});
  protected readonly ultimos = signal<Record<string, Precio>>({});
  protected readonly historial = signal<Record<string, PuntoHistorial[]>>({});
  protected readonly flash = signal<Record<string, 'sube' | 'baja'>>({});
  protected readonly errorPrecios = signal<string | null>(null);
  protected readonly errorSeguimiento = signal<string | null>(null);

  protected readonly tarjetas = computed(() =>
    (this.seguidos() ?? []).map((s) => ({
      simbolo: s,
      nombre: this.nombres()[s] ?? s,
      precio: this.ultimos()[s],
      puntos: this.historial()[s] ?? [],
      flash: this.flash()[s],
    })),
  );

  constructor() {
    this.cargarSeguimiento();
    timer(0, INTERVALO_MS)
      .pipe(
        switchMap(() =>
          this.preciosApi.precios().pipe(
            catchError((e) => {
              this.errorPrecios.set(mensajeError(e, 'ms-precios (8084)'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.actualizar(lista));
  }

  protected cargarSeguimiento(): void {
    this.errorSeguimiento.set(null);
    forkJoin([this.seguimientoApi.obtener(), this.preciosApi.catalogo()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([seguidos, catalogo]) => {
          this.nombres.set(Object.fromEntries(catalogo.map((c) => [c.simbolo, c.nombre])));
          this.seguidos.set(seguidos);
          this.cargarHistorial(seguidos);
        },
        error: (e) => this.errorSeguimiento.set(mensajeError(e, 'ms-alertas / ms-precios')),
      });
  }

  private cargarHistorial(simbolos: string[]): void {
    if (simbolos.length === 0) {
      return;
    }
    forkJoin(
      simbolos.map((s) => this.preciosApi.historial(s, 60).pipe(catchError(() => of<PuntoHistorial[]>([])))),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((series) =>
        this.historial.update((h) => {
          const nuevo = { ...h };
          simbolos.forEach((s, i) => (nuevo[s] = series[i]));
          return nuevo;
        }),
      );
  }

  private actualizar(lista: Precio[]): void {
    this.errorPrecios.set(null);
    const anteriores = this.ultimos();
    const seguidos = new Set(this.seguidos() ?? []);
    const cambios: Record<string, 'sube' | 'baja'> = {};

    for (const p of lista) {
      const previo = anteriores[p.simbolo];
      if (previo && p.precio !== previo.precio) {
        cambios[p.simbolo] = p.precio > previo.precio ? 'sube' : 'baja';
      }
    }
    this.ultimos.set(Object.fromEntries(lista.map((p) => [p.simbolo, p])));

    this.historial.update((h) => {
      const nuevo = { ...h };
      for (const p of lista) {
        const serie = nuevo[p.simbolo];
        if (!seguidos.has(p.simbolo) || !serie || serie.at(-1)?.timestamp === p.timestamp) {
          continue;
        }
        nuevo[p.simbolo] = [...serie, { timestamp: p.timestamp, precio: p.precio }].slice(-MAX_PUNTOS);
      }
      return nuevo;
    });

    if (Object.keys(cambios).length > 0) {
      this.flash.set(cambios);
      setTimeout(() => this.flash.set({}), 900);
    }
  }
}
