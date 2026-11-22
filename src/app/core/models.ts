/** Contratos de la API (ver CONTRATO.md del backend). Los BigDecimal llegan como number en JSON. */

export interface Cripto {
  simbolo: string;
  nombre: string;
}

export interface Precio {
  simbolo: string;
  precio: number;
  variacion24hPct: number;
  maximo24h: number;
  minimo24h: number;
  volumen24h: number;
  timestamp: string;
  fuente: 'BINANCE' | 'SIMULADO';
}

export interface PuntoHistorial {
  timestamp: string;
  precio: number;
}

export type TipoAlerta = 'PRECIO_MAYOR_IGUAL' | 'PRECIO_MENOR_IGUAL' | 'VARIACION_VENTANA';
export type Direccion = 'SUBE' | 'BAJA' | 'AMBAS';
export type EstadoAlerta = 'ACTIVA' | 'DISPARADA' | 'CANCELADA';

export interface Alerta {
  id: number;
  simbolo: string;
  tipo: TipoAlerta;
  /** Precio objetivo; null en VARIACION_VENTANA. */
  valor: number | null;
  estado: EstadoAlerta;
  creadaEn: string;
  disparadaEn: string | null;
  precioDisparo: number | null;
  direccion: Direccion | null;
  porcentaje: number | null;
  ventanaMinutos: number | null;
}

/** Lo mínimo para describir una alerta en texto (sirve para la alerta guardada y para el formulario). */
export type CondicionAlerta = Pick<Alerta, 'simbolo' | 'tipo'> &
  Partial<Pick<Alerta, 'valor' | 'direccion' | 'porcentaje' | 'ventanaMinutos'>>;

export interface AlertaRequest {
  simbolo: string;
  tipo: TipoAlerta;
  valor?: number;
  direccion?: Direccion;
  porcentaje?: number;
  ventanaMinutos?: number;
}
