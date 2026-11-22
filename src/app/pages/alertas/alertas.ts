import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { AlertasService } from '../../core/alertas.service';
import { mensajeError } from '../../core/errores';
import { Alerta, Cripto, EstadoAlerta, Precio, TipoAlerta } from '../../core/models';
import { PreciosService } from '../../core/precios.service';
import { condicion } from '../../shared/formato';
import { PrecioPipe } from '../../shared/formato.pipes';

/** Formulario con resumen en lenguaje natural + lista de alertas con estado y botón cancelar. */
@Component({
  selector: 'app-alertas',
  imports: [ReactiveFormsModule, DatePipe, PrecioPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alertas.html',
})
export class Alertas {
  private readonly alertasApi = inject(AlertasService);
  private readonly preciosApi = inject(PreciosService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    simbolo: ['BTC', Validators.required],
    tipo: ['PRECIO_MAYOR_IGUAL' as TipoAlerta, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.00000001)]],
  });
  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly catalogo = signal<Cripto[]>([]);
  protected readonly precios = signal<Record<string, Precio>>({});
  protected readonly alertas = signal<Alerta[] | null>(null);
  protected readonly filtro = signal<EstadoAlerta | 'TODAS'>('TODAS');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);

  protected readonly estados: (EstadoAlerta | 'TODAS')[] = ['TODAS', 'ACTIVA', 'DISPARADA', 'CANCELADA'];
  protected readonly condicion = condicion;

  protected readonly resumen = computed(() => {
    const v = this.valores();
    if (!v.simbolo || !v.tipo || v.valor == null || !(v.valor > 0)) {
      return 'Completa el formulario para ver el resumen.';
    }
    return `Avísame si ${condicion(v.simbolo, v.tipo, v.valor)}`;
  });

  protected readonly precioActual = computed(() => this.precios()[this.valores().simbolo ?? '']);

  protected readonly visibles = computed(() => {
    const f = this.filtro();
    const lista = this.alertas() ?? [];
    return f === 'TODAS' ? lista : lista.filter((a) => a.estado === f);
  });

  constructor() {
    this.preciosApi.catalogo().subscribe({ next: (c) => this.catalogo.set(c), error: () => {} });
    // Lista y precios se refrescan cada 10 s para ver cuándo una alerta pasa a DISPARADA.
    timer(0, 10000)
      .pipe(
        switchMap(() => this.alertasApi.listar().pipe(catchError((e) => this.fallo(e)))),
        takeUntilDestroyed(),
      )
      .subscribe((a) => this.alertas.set(a));
    timer(0, 10000)
      .pipe(
        switchMap(() => this.preciosApi.precios().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.precios.set(Object.fromEntries(lista.map((p) => [p.simbolo, p]))));
  }

  protected crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { simbolo, tipo, valor } = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.exito.set(null);
    this.alertasApi.crear({ simbolo, tipo, valor: valor! }).subscribe({
      next: (a) => {
        this.alertas.update((lista) => [a, ...(lista ?? [])]);
        this.exito.set(`Alerta creada: ${condicion(a.simbolo, a.tipo, a.valor)}`);
        this.form.controls.valor.reset(null);
        this.enviando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'ms-alertas (8081)'));
        this.enviando.set(false);
      },
    });
  }

  protected cancelar(alerta: Alerta): void {
    this.alertasApi.cancelar(alerta.id).subscribe({
      next: () =>
        this.alertas.update((lista) =>
          (lista ?? []).map((a) => (a.id === alerta.id ? { ...a, estado: 'CANCELADA' } : a)),
        ),
      error: (e) => this.error.set(mensajeError(e, 'ms-alertas (8081)')),
    });
  }

  protected usarPrecioActual(): void {
    const p = this.precioActual();
    if (p) {
      this.form.controls.valor.setValue(p.precio);
    }
  }

  private fallo(e: unknown) {
    this.error.set(mensajeError(e, 'ms-alertas (8081)'));
    return EMPTY;
  }
}
