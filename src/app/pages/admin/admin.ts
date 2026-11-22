import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { catchError, EMPTY, Observable, of, switchMap, timer } from 'rxjs';
import { AdminKafkaService } from '../../core/admin-kafka.service';
import { mensajeError } from '../../core/errores';
import { GrupoDetalle, GrupoResumen, TopicDetalle, TopicResumen } from '../../core/models';

const SERVICIO = 'ms-admin-kafka (8085)';
const HORA_MS = 3_600_000;

/** "86400000" → "24 h", "604800000" → "7 d", "-1" → "infinita" (días solo desde 2 d). */
export function retencionLegible(ms: string | undefined): string {
  if (ms == null) return 'por defecto';
  const n = Number(ms);
  if (n < 0) return 'infinita';
  if (n >= 48 * HORA_MS && n % (24 * HORA_MS) === 0) return `${n / (24 * HORA_MS)} d`;
  if (n % HORA_MS === 0) return `${n / HORA_MS} h`;
  return `${Math.round(n / 60000)} min`;
}

/**
 * Panel de administración de Kafka sobre ms-admin-kafka: tópicos (crear, ver particiones/ISR, cambiar retención,
 * aumentar particiones, eliminar) y consumer groups (miembros, offsets y lag por partición).
 */
@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, KeyValuePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
})
export class Admin {
  private readonly api = inject(AdminKafkaService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly topicos = signal<TopicResumen[] | null>(null);
  protected readonly grupos = signal<GrupoResumen[] | null>(null);
  protected readonly topicoSel = signal<string | null>(null);
  protected readonly grupoSel = signal<string | null>(null);
  protected readonly detalleTopico = signal<TopicDetalle | null>(null);
  protected readonly detalleGrupo = signal<GrupoDetalle | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal<string | null>(null);
  protected readonly ocupado = signal(false);
  private readonly recargar = signal(0);

  protected readonly retencionLegible = retencionLegible;

  protected readonly crearForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{1,249}$/)]],
    particiones: [3, [Validators.required, Validators.min(1)]],
    replicas: [3, [Validators.required, Validators.min(1), Validators.max(3)]],
    retencionHoras: [24, [Validators.required, Validators.min(1)]],
  });
  protected readonly retencionForm = this.fb.control(24, [Validators.required, Validators.min(1)]);
  protected readonly particionesForm = this.fb.control(1, [Validators.required, Validators.min(1)]);

  /** Particiones con menos réplicas en sincronía que réplicas asignadas (algún broker caído o atrasado). */
  protected readonly subReplicadas = computed(
    () => this.detalleTopico()?.detalleParticiones.filter((p) => p.isr.length < p.replicas.length).length ?? 0,
  );

  constructor() {
    // Listas: cada 10 s (y al instante tras crear/eliminar, vía "recargar").
    toObservable(this.recargar)
      .pipe(
        switchMap(() => timer(0, 10000)),
        switchMap(() => this.api.topicos().pipe(catchError((e) => this.fallo(e)))),
        takeUntilDestroyed(),
      )
      .subscribe((t) => this.topicos.set([...t].sort((a, b) => a.nombre.localeCompare(b.nombre))));
    toObservable(this.recargar)
      .pipe(
        switchMap(() => timer(0, 10000)),
        switchMap(() => this.api.grupos().pipe(catchError((e) => this.fallo(e)))),
        takeUntilDestroyed(),
      )
      .subscribe((g) => this.grupos.set([...g].sort((a, b) => a.groupId.localeCompare(b.groupId))));

    // Detalle del tópico elegido.
    toObservable(this.topicoSel)
      .pipe(
        switchMap((n) => (n ? this.api.topico(n).pipe(catchError((e) => this.fallo(e))) : of(null))),
        takeUntilDestroyed(),
      )
      .subscribe((d) => this.mostrarTopico(d));

    // Detalle del grupo elegido: cada 5 s, para ver el lag moverse.
    toObservable(this.grupoSel)
      .pipe(
        switchMap((id) =>
          id
            ? timer(0, 5000).pipe(switchMap(() => this.api.grupo(id).pipe(catchError((e) => this.fallo(e)))))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((d) => this.detalleGrupo.set(d));
  }

  protected elegirTopico(nombre: string): void {
    this.topicoSel.set(this.topicoSel() === nombre ? null : nombre);
  }

  protected elegirGrupo(id: string): void {
    this.grupoSel.set(this.grupoSel() === id ? null : id);
  }

  protected crear(): void {
    if (this.crearForm.invalid) {
      this.crearForm.markAllAsTouched();
      return;
    }
    const v = this.crearForm.getRawValue();
    this.ejecutar(
      this.api.crear({
        name: v.name,
        particiones: v.particiones,
        replicas: v.replicas,
        configs: { 'retention.ms': String(v.retencionHoras * HORA_MS), 'min.insync.replicas': v.replicas >= 2 ? '2' : '1' },
      }),
      (t) => {
        this.exito.set(`Tópico ${t.nombre} creado con ${t.particiones} particiones y RF ${t.replicas}.`);
        this.crearForm.controls.name.reset('');
        this.recargar.update((n) => n + 1);
        this.topicoSel.set(t.nombre);
      },
    );
  }

  protected cambiarRetencion(d: TopicDetalle): void {
    if (this.retencionForm.invalid) return;
    const horas = this.retencionForm.value;
    this.ejecutar(this.api.cambiarConfigs(d.nombre, { 'retention.ms': String(horas * HORA_MS) }), (nuevo) => {
      this.exito.set(`Retención de ${d.nombre}: ${retencionLegible(nuevo.configs['retention.ms'])}.`);
      this.mostrarTopico(nuevo);
      this.actualizarEnLista(nuevo);
    });
  }

  protected aumentarParticiones(d: TopicDetalle): void {
    const n = this.particionesForm.value;
    if (this.particionesForm.invalid || n <= d.particiones) {
      this.error.set(`Kafka solo permite aumentar particiones: indica un número mayor que ${d.particiones}.`);
      return;
    }
    if (!confirm(`¿Aumentar ${d.nombre} a ${n} particiones? No se puede deshacer y cambia a qué partición va cada clave.`)) {
      return;
    }
    this.ejecutar(this.api.aumentarParticiones(d.nombre, n), (nuevo) => {
      this.exito.set(`${d.nombre} ahora tiene ${nuevo.particiones} particiones.`);
      this.mostrarTopico(nuevo);
      this.actualizarEnLista(nuevo);
    });
  }

  protected eliminar(d: TopicDetalle): void {
    if (!confirm(`¿Eliminar el tópico ${d.nombre} y todos sus mensajes?`)) return;
    this.ejecutar(this.api.eliminar(d.nombre), () => {
      this.exito.set(`Tópico ${d.nombre} eliminado.`);
      this.topicoSel.set(null);
      this.recargar.update((n) => n + 1);
    });
  }

  private mostrarTopico(d: TopicDetalle | null): void {
    this.detalleTopico.set(d);
    if (d) {
      const ms = Number(d.configs['retention.ms']);
      this.retencionForm.setValue(ms > 0 ? Math.max(1, Math.round(ms / HORA_MS)) : 24);
      this.particionesForm.setValue(d.particiones + 1);
    }
  }

  private actualizarEnLista(d: TopicDetalle): void {
    this.topicos.update((l) => (l ?? []).map((t) => (t.nombre === d.nombre ? d : t)));
  }

  private ejecutar<T>(op: Observable<T>, ok: (r: T) => void): void {
    this.ocupado.set(true);
    this.error.set(null);
    this.exito.set(null);
    op.subscribe({
      next: (r) => {
        ok(r);
        this.ocupado.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, SERVICIO));
        this.ocupado.set(false);
      },
    });
  }

  private fallo(e: unknown) {
    this.error.set(mensajeError(e, SERVICIO));
    return EMPTY;
  }
}
