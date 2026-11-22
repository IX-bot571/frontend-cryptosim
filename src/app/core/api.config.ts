/** URLs base de los microservicios. Único lugar donde se escriben: los servicios las importan de aquí. */
export const API = {
  alertas: 'http://localhost:8081/api',
  precios: 'http://localhost:8084/api',
  adminKafka: 'http://localhost:8085/api',
} as const;

/** Orígenes a los que el interceptor agrega el JWT (8081, 8084 y 8085). */
export const ORIGENES_CON_JWT: readonly string[] = Object.values(API).map((url) => new URL(url).origin);
