import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarMenuItem {
  label: string;
  route: string;
  exact: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly routeSelected = output<void>();

  readonly menuItems: readonly SidebarMenuItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
      exact: true,
    },
    {
      label: 'Facturación CPE',
      route: '/app/cpe/emitir',
      exact: false,
    },
    {
      label: 'Ventas',
      route: '/app/ventas',
      exact: false,
    },
    {
      label: 'Productos',
      route: '/app/productos',
      exact: false,
    },
    {
      label: 'Inventario',
      route: '/app/inventario',
      exact: false,
    },
    {
      label: 'Compras',
      route: '/app/compras',
      exact: false,
    },
    {
      label: 'Caja',
      route: '/app/caja',
      exact: false,
    },
    {
      label: 'Reportes',
      route: '/app/reportes',
      exact: false,
    },
    {
      label: 'Configuración',
      route: '/app/configuracion',
      exact: false,
    },
  ];

  onRouteSelected(): void {
    this.routeSelected.emit();
  }
}
