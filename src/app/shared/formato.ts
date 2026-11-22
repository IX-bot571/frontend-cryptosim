import { CondicionAlerta, TipoAlerta } from '../core/models';

const formatos = new Map<string, Intl.NumberFormat>();

function formato(min: number, max: number): Intl.NumberFormat {
  const clave = `${min}-${max}`;
  let f = formatos.get(clave);
  if (!f) {
    f = new Intl.NumberFormat('es-CL', { minimumFractionDigits: min, maximumFractionDigits: max });
    formatos.set(clave, f);
  }
  return f;
}

/** Decimales según magnitud: 100.000,00 · 2,9500 · 0,055170. */
export function formatoPrecio(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) {
    return '—';
  }
  const abs = Math.abs(valor);
  if (abs >= 1000) return formato(2, 2).format(valor);
  if (abs >= 1) return formato(2, 4).format(valor);
  return formato(4, 6).format(valor);
}

export function formatoPorcentaje(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) {
    return '—';
  }
  return `${valor > 0 ? '+' : ''}${formato(2, 2).format(valor)} %`;
}

export function formatoCompacto(valor: number | null | undefined): string {
  if (valor == null) {
    return '—';
  }
  return new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
}

export function operador(tipo: TipoAlerta): string {
  return tipo === 'PRECIO_MAYOR_IGUAL' ? '≥' : '≤';
}

const VERBO = { SUBE: 'sube', BAJA: 'baja', AMBAS: 'se mueve ±' } as const;

/** "BTC ≥ 100.000" o "BTC sube 1 % en 120 min" */
export function condicion(a: CondicionAlerta): string {
  if (a.tipo === 'VARIACION_VENTANA') {
    const verbo = a.direccion ? VERBO[a.direccion] : '?';
    return `${a.simbolo} ${verbo} ${formato(0, 4).format(a.porcentaje ?? 0)} % en ${a.ventanaMinutos ?? '?'} min`;
  }
  return `${a.simbolo} ${operador(a.tipo)} ${formatoPrecio(a.valor)}`;
}
