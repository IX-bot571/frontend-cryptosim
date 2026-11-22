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

export type TipoAlerta = 'PRECIO_MAYOR_IGUAL' | 'PRECIO_MENOR_IGUAL';
export type EstadoAlerta = 'ACTIVA' | 'DISPARADA' | 'CANCELADA';

export interface Alerta {
  id: number;
  simbolo: string;
  tipo: TipoAlerta;
  valor: number;
  estado: EstadoAlerta;
  creadaEn: string;
  disparadaEn: string | null;
  precioDisparo: number | null;
}

export interface AlertaRequest {
  simbolo: string;
  tipo: TipoAlerta;
  valor: number;
}
