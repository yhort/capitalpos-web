import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

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
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly mobileMediaQuery = window.matchMedia('(max-width: 768px)');
  private previousBodyOverflow: string | null = null;

  private readonly fallbackPageTitle = 'Dashboard';
  private readonly fallbackBreadcrumbItems: readonly BreadcrumbItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
    },
  ];

  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly isMobileViewport = signal(this.mobileMediaQuery.matches);
  readonly pageTitle = signal(this.fallbackPageTitle);
  readonly breadcrumbItems = signal<readonly BreadcrumbItem[]>(
    this.fallbackBreadcrumbItems,
  );
  readonly menuExpanded = computed(() =>
    this.isMobileViewport()
      ? this.mobileSidebarOpen()
      : !this.sidebarCollapsed(),
  );

  constructor() {
    const updateMobileViewport = (event?: MediaQueryListEvent): void => {
      const isMobile = event?.matches ?? this.mobileMediaQuery.matches;

      this.isMobileViewport.set(isMobile);

      if (!isMobile) {
        this.closeMobileSidebar();
      }
    };

    this.mobileMediaQuery.addEventListener('change', updateMobileViewport);

    this.destroyRef.onDestroy(() => {
      this.mobileMediaQuery.removeEventListener('change', updateMobileViewport);
      this.unlockBodyScroll();
    });

    effect(() => {
      if (this.mobileSidebarOpen() && this.isMobileViewport()) {
        this.lockBodyScroll();
        return;
      }

      this.unlockBodyScroll();
    });

    this.updateRouteMetadata();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.closeMobileSidebar();
        this.updateRouteMetadata();
      });
  }

  toggleSidebar(): void {
    if (this.isMobileViewport()) {
      this.mobileSidebarOpen.update((open) => !open);
      return;
    }

    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMobileSidebar();
  }

  private lockBodyScroll(): void {
    if (this.previousBodyOverflow !== null) {
      return;
    }

    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }

    this.document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }

  private updateRouteMetadata(): void {
    const activeRoute = this.getDeepestActiveRoute();
    const routeData = activeRoute?.snapshot?.data ?? {};
    const pageTitle = routeData['pageTitle'];
    const breadcrumb = routeData['breadcrumb'];

    this.pageTitle.set(
      typeof pageTitle === 'string' ? pageTitle : this.fallbackPageTitle,
    );
    this.breadcrumbItems.set(
      this.isBreadcrumbItems(breadcrumb)
        ? breadcrumb
        : this.fallbackBreadcrumbItems,
    );
  }

  private getDeepestActiveRoute(): ActivatedRoute | null {
    let activeRoute: ActivatedRoute | null = this.activatedRoute;

    while (activeRoute?.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    return activeRoute;
  }

  private isBreadcrumbItems(value: unknown): value is readonly BreadcrumbItem[] {
    return (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'label' in item &&
          typeof item.label === 'string' &&
          (!('route' in item) || typeof item.route === 'string'),
      )
    );
  }
}
