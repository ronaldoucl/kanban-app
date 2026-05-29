import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * Barra de navegación superior compartida por todas las pantallas autenticadas.
 * Es autónoma: resuelve el cierre de sesión a través de AuthService, de modo
 * que las vistas que la consumen solo tienen que renderizar <app-navbar />.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
