import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PuntoHistorial } from '../core/models';

/** Mini gráfica SVG propia (sin librerías): línea + área, verde si sube y rojo si baja en el periodo. */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="spark" [class.baja]="!sube()" [attr.viewBox]="'0 0 ' + ancho + ' ' + alto"
         preserveAspectRatio="none" role="img" [attr.aria-label]="etiqueta()">
      @if (trazo(); as t) {
        <path class="spark-area" [attr.d]="t.area" />
        <path class="spark-linea" [attr.d]="t.linea" vector-effect="non-scaling-stroke" />
      } @else {
        <text x="50%" y="55%" text-anchor="middle" class="spark-vacio">Reuniendo datos…</text>
      }
    </svg>
  `,
})
export class Sparkline {
  readonly puntos = input.required<PuntoHistorial[]>();
  protected readonly ancho = 240;
  protected readonly alto = 60;
  private readonly margen = 4;

  protected readonly sube = computed(() => {
    const p = this.puntos();
    return p.length < 2 || p[p.length - 1].precio >= p[0].precio;
  });

  protected readonly etiqueta = computed(() => `Evolución con ${this.puntos().length} puntos`);

  protected readonly trazo = computed(() => {
    const p = this.puntos();
    if (p.length < 2) {
      return null;
    }
    const valores = p.map((x) => x.precio);
    const min = Math.min(...valores);
    const rango = Math.max(...valores) - min || 1;
    const alturaUtil = this.alto - 2 * this.margen;
    const coords = valores.map((v, i) => {
      const x = (i / (valores.length - 1)) * this.ancho;
      const y = this.alto - this.margen - ((v - min) / rango) * alturaUtil;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    const linea = `M ${coords.join(' L ')}`;
    return { linea, area: `${linea} L ${this.ancho} ${this.alto} L 0 ${this.alto} Z` };
  });
}
