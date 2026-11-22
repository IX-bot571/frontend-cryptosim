import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly enlaces = [
    { ruta: '/mercado', texto: 'Mercado' },
    { ruta: '/seguimiento', texto: 'Seguimiento' },
    { ruta: '/alertas', texto: 'Mis alertas' },
    { ruta: '/notificaciones', texto: 'Notificaciones' },
  ];
}
