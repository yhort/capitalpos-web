import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../breadcrumb/breadcrumb.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);

  readonly breadcrumbItems: readonly BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
    },
  ];

  toggleSidebar(): void {
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.mobileSidebarOpen.update((open) => !open);
      return;
    }

    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
