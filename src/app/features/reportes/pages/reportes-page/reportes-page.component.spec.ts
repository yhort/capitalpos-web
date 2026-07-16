import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { ReportesPageComponent } from './reportes-page.component';

describe('ReportesPageComponent', () => {
  let fixture: ComponentFixture<ReportesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesPageComponent],
      providers: [
        provideRouter([
          {
            path: 'app/reportes/ventas-por-canal',
            component: DummyRouteComponent,
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('shows a useful reports index instead of only a construction placeholder', () => {
    const textContent = fixture.nativeElement.textContent;

    expect(textContent).toContain('Reportes comerciales y operativos');
    expect(textContent).toContain('Ventas por canal');
    expect(textContent).not.toContain('En construcción');
  });

  it('shows the sales by channel report card and link', () => {
    const textContent = fixture.nativeElement.textContent;
    const link = fixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;

    expect(textContent).toContain('Consulta ventas por canal comercial, unidades, soles y precio promedio.');
    expect(textContent).toContain('Cantidad ventas');
    expect(textContent).toContain('Unidades');
    expect(textContent).toContain('Soles');
    expect(textContent).toContain('Precio promedio');
    expect(link.getAttribute('href')).toBe('/app/reportes/ventas-por-canal');
  });

  it('navigates to sales by channel when clicking the report link', async () => {
    const router = TestBed.inject(Router);
    const link = fixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;

    link.click();
    await fixture.whenStable();

    expect(router.url).toBe('/app/reportes/ventas-por-canal');
  });
});

@Component({
  selector: 'app-dummy-route',
  template: '',
})
class DummyRouteComponent {}
