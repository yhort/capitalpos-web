import { Routes } from '@angular/router';

import { authChildGuard, authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'app/dashboard',
    },
    {
        path: 'auth/login',
        title: 'Iniciar sesión | CapitalPOS',
        loadComponent: () =>
            import(
                './features/auth/pages/login-page/login-page.component'
            ).then((component) => component.LoginPageComponent),
    },
    {
        path: 'app',
        component: ShellComponent,
        canActivate: [authGuard],
        canActivateChild: [authChildGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                title: 'Dashboard | CapitalPOS',
                data: {
                    pageTitle: 'Dashboard',
                    breadcrumb: [{ label: 'Dashboard' }],
                },
                loadComponent: () =>
                    import(
                        './features/dashboard/pages/dashboard-page/dashboard-page.component'
                    ).then((component) => component.DashboardPageComponent),
            },
            {
                path: 'cpe/emitir',
                title: 'Emitir CPE | CapitalPOS',
                data: {
                    pageTitle: 'Emitir CPE',
                    breadcrumb: [
                        { label: 'Facturación CPE' },
                        { label: 'Emitir CPE' },
                    ],
                },
                loadComponent: () =>
                    import(
                        './features/cpe/pages/emitir-cpe-page/emitir-cpe-page.component'
                    ).then((component) => component.EmitirCpePageComponent),
            },
            {
                path: 'ventas',
                title: 'Ventas | CapitalPOS',
                data: {
                    pageTitle: 'Ventas',
                    breadcrumb: [{ label: 'Ventas' }],
                },
                loadComponent: () =>
                    import('./features/ventas/pages/ventas-page/ventas-page.component').then(
                        (component) => component.VentasPageComponent,
                    ),
            },
            {
                path: 'productos',
                title: 'Productos | CapitalPOS',
                data: {
                    pageTitle: 'Productos',
                    breadcrumb: [{ label: 'Productos' }],
                },
                loadComponent: () =>
                    import(
                        './features/productos/pages/productos-page/productos-page.component'
                    ).then((component) => component.ProductosPageComponent),
            },
            {
                path: 'inventario',
                title: 'Inventario | CapitalPOS',
                data: {
                    pageTitle: 'Inventario',
                    breadcrumb: [{ label: 'Inventario' }],
                },
                loadComponent: () =>
                    import(
                        './features/inventario/pages/inventario-page/inventario-page.component'
                    ).then((component) => component.InventarioPageComponent),
            },
            {
                path: 'compras',
                title: 'Compras | CapitalPOS',
                data: {
                    pageTitle: 'Compras',
                    breadcrumb: [{ label: 'Compras' }],
                },
                loadComponent: () =>
                    import('./features/compras/pages/compras-page/compras-page.component').then(
                        (component) => component.ComprasPageComponent,
                    ),
            },
            {
                path: 'caja',
                title: 'Caja | CapitalPOS',
                data: {
                    pageTitle: 'Caja',
                    breadcrumb: [{ label: 'Caja' }],
                },
                loadComponent: () =>
                    import('./features/caja/pages/caja-page/caja-page.component').then(
                        (component) => component.CajaPageComponent,
                    ),
            },
            {
                path: 'reportes/ventas-por-canal',
                title: 'Ventas por canal | CapitalPOS',
                data: {
                    pageTitle: 'Ventas por canal',
                    breadcrumb: [
                        { label: 'Reportes' },
                        { label: 'Ventas por canal' },
                    ],
                },
                loadComponent: () =>
                    import(
                        './features/reportes/pages/ventas-por-canal-page/ventas-por-canal-page.component'
                    ).then((component) => component.VentasPorCanalPageComponent),
            },
            {
                path: 'reportes',
                title: 'Reportes | CapitalPOS',
                data: {
                    pageTitle: 'Reportes',
                    breadcrumb: [{ label: 'Reportes' }],
                },
                loadComponent: () =>
                    import(
                        './features/reportes/pages/reportes-page/reportes-page.component'
                    ).then((component) => component.ReportesPageComponent),
            },
            {
                path: 'configuracion',
                title: 'Configuración | CapitalPOS',
                data: {
                    pageTitle: 'Configuración',
                    breadcrumb: [{ label: 'Configuración' }],
                },
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
