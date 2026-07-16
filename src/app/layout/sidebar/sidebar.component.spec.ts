import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          {
            path: 'app/reportes',
            component: DummyRouteComponent,
          },
          {
            path: 'app/reportes/ventas-por-canal',
            component: DummyRouteComponent,
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps Reportes active on the reports index and sales by channel route', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/app/reportes');
    fixture.detectChanges();
    await fixture.whenStable();

    let reportesLink = getReportesLink();
    expect(reportesLink.classList.contains('sidebar__link--active')).toBe(true);

    await router.navigateByUrl('/app/reportes/ventas-por-canal');
    fixture.detectChanges();
    await fixture.whenStable();

    reportesLink = getReportesLink();
    expect(reportesLink.classList.contains('sidebar__link--active')).toBe(true);
  });

  function getReportesLink(): HTMLAnchorElement {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    const reportesLink = links.find((link) => link.textContent?.includes('Reportes'));

    if (!reportesLink) {
      throw new Error('Reportes link not found');
    }

    return reportesLink;
  }
});

@Component({
  selector: 'app-dummy-route',
  template: '',
})
class DummyRouteComponent {}
