import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PuntoHistorial } from '../core/models';
import { formatoPrecio } from './formato';

export interface SerieComparador {
  simbolo: string;
  /** Índice fijo en el catálogo: decide el color (no el orden de la lista), así no cambia al seguir otra cripto. */
  indiceCatalogo: number;
  puntos: PuntoHistorial[];
}

interface SerieNormalizada {
  simbolo: string;
  color: string;
  discontinua: boolean;
  puntos: { t: number; v: number; precio: number }[];
  ultimo: number;
}

const ANCHO = 1000;
const ALTO = 260;
const MARGEN_V = 12;
const DECIMALES = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const HORA = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' });

/**
 * Comparador base 100 en SVG propio: cada serie se divide por su primer precio del periodo y se multiplica por 100,
 * así criptos de precios muy distintos (BTC 60.000 vs DOGE 0,05) se comparan en un único eje.
 * 8 colores categóricos fijos (validados para CVD sobre el fondo oscuro); del 9.º en adelante, línea discontinua.
 */
@Component({
  selector: 'app-comparador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (normalizadas().length === 0 || !escala()) {
      <p class="sutil">Reuniendo datos para comparar…</p>
    } @else {
      <div class="comp-leyenda" role="list">
        @for (s of normalizadas(); track s.simbolo) {
          <span class="comp-item" role="listitem">
            <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" [attr.stroke]="s.color"
              stroke-width="2" [attr.stroke-dasharray]="s.discontinua ? '4 3' : null" /></svg>
            <strong>{{ s.simbolo }}</strong>
            <span class="num" [class.texto-positivo]="s.ultimo >= 100" [class.texto-negativo]="s.ultimo < 100">{{ fmt(s.ultimo) }}</span>
          </span>
        }
      </div>
      <div class="comp-area">
        @for (g of escala()!.ticks; track g.v) {
          <span class="comp-eje-y" [style.top.%]="(g.y / alto) * 100">{{ g.v }}</span>
        }
        <div class="comp-plot" (mousemove)="mover($event)" (mouseleave)="cursor.set(null)">
        <svg class="comp-svg" [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none"
             role="img" [attr.aria-label]="descripcion()">
          @for (g of escala()!.ticks; track g.v) {
            <line class="comp-grid" [class.comp-base]="g.v === 100" x1="0" [attr.x2]="ancho"
                  [attr.y1]="g.y" [attr.y2]="g.y" vector-effect="non-scaling-stroke" />
          }
          @for (s of trazos(); track s.simbolo) {
            <path [attr.d]="s.d" fill="none" [attr.stroke]="s.color" stroke-width="2" stroke-linejoin="round"
                  [attr.stroke-dasharray]="s.discontinua ? '6 4' : null" vector-effect="non-scaling-stroke" />
          }
          @if (hover(); as h) {
            <line class="comp-cruz" [attr.x1]="h.x" [attr.x2]="h.x" y1="0" [attr.y2]="alto" vector-effect="non-scaling-stroke" />
          }
        </svg>
        @if (normalizadas().length <= 4) {
          @for (s of etiquetasFinales(); track s.simbolo) {
            <span class="comp-etiqueta" [style.top.%]="s.top">{{ s.simbolo }}</span>
          }
        }
        @if (hover(); as h) {
          @for (p of h.puntos; track p.simbolo) {
            <span class="comp-marca" [style.left.%]="(h.x / ancho) * 100" [style.top.%]="p.top" [style.background]="p.color"></span>
          }
          <div class="comp-tooltip" [style.left.%]="(h.x / ancho) * 100" [class.izquierda]="h.x > ancho * 0.6">
            <div class="sutil pequeño">{{ h.hora }}</div>
            @for (p of h.puntos; track p.simbolo) {
              <div class="comp-fila">
                <span class="comp-punto" [style.background]="p.color"></span>
                <strong>{{ p.simbolo }}</strong>
                <span class="num">{{ fmt(p.v) }}</span>
                <span class="num sutil">US$ {{ precio(p.precio) }}</span>
              </div>
            }
          </div>
        }
        </div>
      </div>
      <div class="comp-eje-x sutil pequeño">
        <span>{{ escala()!.desde }}</span><span>base 100 = primer precio del periodo</span><span>{{ escala()!.hasta }}</span>
      </div>
    }
  `,
})
export class Comparador {
  readonly series = input.required<SerieComparador[]>();
  protected readonly ancho = ANCHO;
  protected readonly alto = ALTO;
  protected readonly cursor = signal<number | null>(null);
  protected readonly fmt = (v: number) => DECIMALES.format(v);
  protected readonly precio = formatoPrecio;

  protected readonly normalizadas = computed<SerieNormalizada[]>(() =>
    this.series()
      .filter((s) => s.puntos.length >= 2)
      .map((s) => {
        const base = s.puntos[0].precio;
        const puntos = s.puntos.map((p) => ({ t: Date.parse(p.timestamp), v: (p.precio / base) * 100, precio: p.precio }));
        return {
          simbolo: s.simbolo,
          color: `var(--serie-${(s.indiceCatalogo % 8) + 1})`,
          discontinua: s.indiceCatalogo >= 8,
          puntos,
          ultimo: puntos[puntos.length - 1].v,
        };
      }),
  );

  protected readonly escala = computed(() => {
    const series = this.normalizadas();
    if (series.length === 0) return null;
    const todos = series.flatMap((s) => s.puntos);
    const t0 = Math.min(...todos.map((p) => p.t));
    const t1 = Math.max(...todos.map((p) => p.t));
    if (t1 <= t0) return null;
    // El rango siempre incluye 100 y es simétrico alrededor de 100, para leer subidas y bajadas igual.
    const desvio = Math.max(0.05, ...todos.map((p) => Math.abs(p.v - 100))) * 1.15;
    const min = 100 - desvio;
    const max = 100 + desvio;
    const y = (v: number) => MARGEN_V + ((max - v) / (max - min)) * (ALTO - 2 * MARGEN_V);
    const x = (t: number) => ((t - t0) / (t1 - t0)) * ANCHO;
    const paso = pasoRedondo(desvio / 2);
    const ticks = [-2, -1, 0, 1, 2]
      .map((k) => Number((100 + k * paso).toFixed(4)))
      .filter((v) => v >= min && v <= max)
      .map((v) => ({ v, y: y(v) }));
    return { x, y, t0, t1, ticks, desde: HORA.format(t0), hasta: HORA.format(t1) };
  });

  protected readonly trazos = computed(() => {
    const e = this.escala();
    if (!e) return [];
    return this.normalizadas().map((s) => ({
      simbolo: s.simbolo,
      color: s.color,
      discontinua: s.discontinua,
      d: 'M ' + s.puntos.map((p) => `${e.x(p.t).toFixed(1)} ${e.y(p.v).toFixed(1)}`).join(' L '),
    }));
  });

  /** Etiquetas directas al final de cada línea (solo con ≤ 4 series), separadas para que no se encimen. */
  protected readonly etiquetasFinales = computed(() => {
    const e = this.escala();
    if (!e) return [];
    const orden = this.normalizadas()
      .map((s) => ({ simbolo: s.simbolo, top: (e.y(s.ultimo) / ALTO) * 100 }))
      .sort((a, b) => a.top - b.top);
    for (let i = 1; i < orden.length; i++) {
      orden[i].top = Math.max(orden[i].top, orden[i - 1].top + 7);
    }
    return orden;
  });

  protected readonly hover = computed(() => {
    const fx = this.cursor();
    const e = this.escala();
    if (fx == null || !e) return null;
    const t = e.t0 + fx * (e.t1 - e.t0);
    const puntos = this.normalizadas().map((s) => {
      const p = cercano(s.puntos, t);
      return { simbolo: s.simbolo, color: s.color, v: p.v, precio: p.precio, t: p.t, top: (e.y(p.v) / ALTO) * 100 };
    });
    const tReal = puntos[0]?.t ?? t;
    return { x: e.x(tReal), hora: new Date(tReal).toLocaleTimeString('es-CL'), puntos };
  });

  protected readonly descripcion = computed(
    () =>
      'Comparación base 100: ' +
      this.normalizadas()
        .map((s) => `${s.simbolo} ${DECIMALES.format(s.ultimo)}`)
        .join(', '),
  );

  protected mover(ev: MouseEvent): void {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.cursor.set(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)));
  }
}

/** 1, 2 o 5 × 10^n: líneas de guía en valores redondos. */
function pasoRedondo(x: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / exp;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : 5) * exp;
}

/** Punto más cercano en el tiempo (búsqueda binaria; los puntos vienen ordenados). */
function cercano<T extends { t: number }>(puntos: T[], t: number): T {
  let lo = 0;
  let hi = puntos.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (puntos[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && t - puntos[lo - 1].t < puntos[lo].t - t ? puntos[lo - 1] : puntos[lo];
}
