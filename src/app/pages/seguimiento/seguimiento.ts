import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { mensajeError } from '../../core/errores';
import { Cripto, Precio } from '../../core/models';
import { PreciosService } from '../../core/precios.service';
import { SeguimientoService } from '../../core/seguimiento.service';
import { PorcentajePipe, PrecioPipe } from '../../shared/formato.pipes';

/** Las 10 criptos del catálogo con un interruptor para seguir o dejar de seguir (actualización optimista). */
@Component({
  selector: 'app-seguimiento',
  imports: [PrecioPipe, PorcentajePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seguimiento.html',
})
export class Seguimiento {
  private readonly preciosApi = inject(PreciosService);
  private readonly seguimientoApi = inject(SeguimientoService);

  protected readonly catalogo = signal<Cripto[] | null>(null);
  protected readonly precios = signal<Record<string, Precio>>({});
  protected readonly seguidos = signal<ReadonlySet<string>>(new Set());
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.error.set(null);
    forkJoin([this.preciosApi.catalogo(), this.seguimientoApi.obtener()]).subscribe({
      next: ([catalogo, seguidos]) => {
        this.catalogo.set(catalogo);
        this.seguidos.set(new Set(seguidos));
      },
      error: (e) => this.error.set(mensajeError(e, 'ms-precios / ms-alertas')),
    });
    this.preciosApi.precios().subscribe({
      next: (lista) => this.precios.set(Object.fromEntries(lista.map((p) => [p.simbolo, p]))),
      error: () => {},
    });
  }

  protected alternar(simbolo: string): void {
    const anterior = this.seguidos();
    const nuevo = new Set(anterior);
    if (!nuevo.delete(simbolo)) {
      nuevo.add(simbolo);
    }
    this.seguidos.set(nuevo);
    this.guardando.set(true);
    this.error.set(null);
    this.seguimientoApi.reemplazar([...nuevo]).subscribe({
      next: (guardados) => {
        this.seguidos.set(new Set(guardados));
        this.guardando.set(false);
      },
      error: (e) => {
        this.seguidos.set(anterior); // se deshace el cambio optimista
        this.guardando.set(false);
        this.error.set(mensajeError(e, 'ms-alertas (8081)'));
      },
    });
  }
}
