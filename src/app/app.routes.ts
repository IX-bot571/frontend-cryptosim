import { Routes } from '@angular/router';

/** Una ruta por pantalla, cargadas de forma diferida (cada pantalla es su propio chunk). */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mercado' },
  { path: 'mercado', title: 'Mercado · CryptoSim', loadComponent: () => import('./pages/mercado/mercado').then((m) => m.Mercado) },
  { path: 'seguimiento', title: 'Seguimiento · CryptoSim', loadComponent: () => import('./pages/seguimiento/seguimiento').then((m) => m.Seguimiento) },
  { path: 'alertas', title: 'Mis alertas · CryptoSim', loadComponent: () => import('./pages/alertas/alertas').then((m) => m.Alertas) },
  { path: 'notificaciones', title: 'Notificaciones · CryptoSim', loadComponent: () => import('./pages/notificaciones/notificaciones').then((m) => m.Notificaciones) },
  { path: '**', redirectTo: 'mercado' },
];
