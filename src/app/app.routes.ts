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
        ],
    },
    {
        path: '**',
        redirectTo: 'app/dashboard',
    },
];