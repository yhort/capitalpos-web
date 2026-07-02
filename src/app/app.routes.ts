import { Routes } from '@angular/router';

import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'app/dashboard',
    },
    {
        path: 'app',
        component: ShellComponent,
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                title: 'Dashboard | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/dashboard/pages/dashboard-page/dashboard-page.component'
                    ).then((component) => component.DashboardPageComponent),
            },
            {
                path: 'cpe/emitir',
                title: 'Emitir CPE | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/cpe/pages/emitir-cpe-page/emitir-cpe-page.component'
                    ).then((component) => component.EmitirCpePageComponent),
            },
            {
                path: 'ventas',
                title: 'Ventas | CapitalPOS',
                loadComponent: () =>
                    import('./features/ventas/pages/ventas-page/ventas-page.component').then(
                        (component) => component.VentasPageComponent,
                    ),
            },
            {
                path: 'productos',
                title: 'Productos | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/productos/pages/productos-page/productos-page.component'
                    ).then((component) => component.ProductosPageComponent),
            },
            {
                path: 'inventario',
                title: 'Inventario | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/inventario/pages/inventario-page/inventario-page.component'
                    ).then((component) => component.InventarioPageComponent),
            },
            {
                path: 'compras',
                title: 'Compras | CapitalPOS',
                loadComponent: () =>
                    import('./features/compras/pages/compras-page/compras-page.component').then(
                        (component) => component.ComprasPageComponent,
                    ),
            },
            {
                path: 'caja',
                title: 'Caja | CapitalPOS',
                loadComponent: () =>
                    import('./features/caja/pages/caja-page/caja-page.component').then(
                        (component) => component.CajaPageComponent,
                    ),
            },
            {
                path: 'reportes',
                title: 'Reportes | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/reportes/pages/reportes-page/reportes-page.component'
                    ).then((component) => component.ReportesPageComponent),
            },
            {
                path: 'configuracion',
                title: 'Configuración | CapitalPOS',
                loadComponent: () =>
                    import(
                        './features/configuracion/pages/configuracion-page/configuracion-page.component'
                    ).then((component) => component.ConfiguracionPageComponent),
            },
        ],
    },
    {
        path: '**',
        redirectTo: 'app/dashboard',
    },
];
