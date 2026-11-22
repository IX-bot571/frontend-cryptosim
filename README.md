# CryptoSim — frontend

Angular 22 (componentes standalone, señales, sin zone.js) con login en Keycloak (PKCE S256).
Consume el backend del repo `backend-cryptosim`; ver su README para levantar la infraestructura y los servicios.

## Requisitos
- Node 22+ y npm.
- Backend arriba: Keycloak (8080), ms-alertas (8081), ms-precios (8084). ms-admin-kafka (8085) es opcional.

## Arrancar
```bash
npm ci
npx ng serve          # http://localhost:4200
```
Login con el usuario de prueba **demo / demo123** (realm `cloudnative`, cliente `angular-app`).

Compilar: `npx ng build` (salida en `dist/`).

## Pantallas
| Ruta | Pantalla | Qué hace |
|---|---|---|
| `/mercado` | Mercado | Tarjetas de las criptos seguidas: precio que parpadea al cambiar, variación 24 h, máx/mín, volumen y mini gráfica SVG. Refresco cada 5 s. |
| `/seguimiento` | Seguimiento | Las 10 criptos del catálogo con interruptor para seguir o dejar de seguir. |
| `/alertas` | Mis alertas | Formulario con resumen en lenguaje natural (precio ≥/≤ o variación % en una ventana de minutos), botón para usar el precio actual, lista filtrable por estado con botón cancelar. |
| `/notificaciones` | Notificaciones | Alertas disparadas (cripto, condición, precio al disparo, hora). Refresco cada 5 s. |
| `/admin` | Admin Kafka | Tópicos (crear, particiones con líder/réplicas/ISR, cambiar retención, aumentar particiones, eliminar) y consumer groups (miembros, offsets y lag por partición, refresco cada 5 s). Requiere ms-admin-kafka (8085). |

## Estructura
```
src/app/
  auth.service.ts, auth.interceptor.ts   Keycloak y JWT en las llamadas a 8081/8084/8085
  core/        api.config.ts (URLs base centralizadas), modelos y servicios por dominio
  shared/      formato es-CL (pipes) y sparkline SVG propio
  pages/       mercado, seguimiento, alertas, notificaciones, admin (cargadas por ruta, lazy)
```
Sin librerías de gráficos: las mini gráficas son SVG propio. Si un servicio no responde, la pantalla lo indica y reintenta.
