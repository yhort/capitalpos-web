import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ConfiguracionFiscalApiService } from '../../data-access/configuracion-fiscal-api.service';
import {
  ConfiguracionFiscalEmpresa,
  GuardarConfiguracionFiscalEmpresaRequest,
} from '../../models/configuracion-fiscal-empresa.model';
import { ConfiguracionPageComponent } from './configuracion-page.component';

describe('ConfiguracionPageComponent', () => {
  let fixture: ComponentFixture<ConfiguracionPageComponent>;
  let component: ConfiguracionPageComponent;
  let configuracionFiscalApi: ConfiguracionFiscalApiServiceFake;

  beforeEach(async () => {
    configuracionFiscalApi = new ConfiguracionFiscalApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [ConfiguracionPageComponent],
      providers: [
        {
          provide: ConfiguracionFiscalApiService,
          useValue: configuracionFiscalApi,
        },
      ],
    }).compileComponents();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(ConfiguracionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads existing fiscal configuration into the form', async () => {
    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('CapitalPOS SAC');
    expect(component['configuracionForm'].controls.ruc.value).toBe('20601234567');
    expect(component['configuracionForm'].controls.ubigeo.value).toBe('150101');
  });

  it('shows an empty form when fiscal configuration does not exist', async () => {
    configuracionFiscalApi.obtenerConfiguracionResponse = throwError(() =>
      new HttpErrorResponse({
        status: 404,
        error: {
          mensaje: 'La empresa activa no tiene configuracion fiscal.',
        },
      }),
    );

    await crearComponente();

    expect(component['configuracion']()).toBeNull();
    expect(component['estado']()).toBe('listo');
    expect(component['mensaje']()).toContain('aun no tiene configuracion fiscal');
    expect(component['configuracionForm'].controls.ruc.value).toBe('');
  });

  it('saves normalized fiscal configuration and refreshes the form with the response', async () => {
    await crearComponente();

    component['configuracionForm'].patchValue({
      ruc: '20600000001',
      razonSocial: '  Demo Retail SAC  ',
      nombreComercial: '  Demo POS  ',
      ubigeo: '150102',
      direccion: '  Av. Cliente 456  ',
      departamento: ' Lima ',
      provincia: ' Lima ',
      distrito: ' Miraflores ',
      activa: true,
    });

    component['guardarConfiguracion']();

    expect(configuracionFiscalApi.ultimoGuardarRequest).toEqual({
      ruc: '20600000001',
      razonSocial: 'Demo Retail SAC',
      nombreComercial: 'Demo POS',
      ubigeo: '150102',
      direccion: 'Av. Cliente 456',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      activa: true,
    });
    expect(component['mensaje']()).toBe('Configuracion fiscal guardada correctamente.');
    expect(component['configuracionForm'].controls.razonSocial.value).toBe('Demo Retail SAC');
  });

  it('validates RUC and ubigeo before saving', async () => {
    await crearComponente();

    component['configuracionForm'].patchValue({
      ruc: '123',
      ubigeo: '1501',
    });

    component['guardarConfiguracion']();

    expect(configuracionFiscalApi.ultimoGuardarRequest).toBeNull();
    expect(component['mensaje']()).toBe('Revisa los datos fiscales antes de guardar.');
  });

  it('shows backend errors while saving', async () => {
    await crearComponente();
    configuracionFiscalApi.guardarConfiguracionResponse = throwError(() =>
      new HttpErrorResponse({
        status: 400,
        error: {
          mensaje: 'El RUC debe tener 11 digitos.',
        },
      }),
    );

    component['guardarConfiguracion']();

    expect(component['mensaje']()).toBe('El RUC debe tener 11 digitos.');
  });
});

class ConfiguracionFiscalApiServiceFake {
  ultimoGuardarRequest: GuardarConfiguracionFiscalEmpresaRequest | null = null;
  obtenerConfiguracionResponse: Observable<ConfiguracionFiscalEmpresa> = of(crearConfiguracionFiscalResponse());
  guardarConfiguracionResponse: Observable<ConfiguracionFiscalEmpresa> | null = null;

  obtenerConfiguracion() {
    return this.obtenerConfiguracionResponse;
  }

  guardarConfiguracion(request: GuardarConfiguracionFiscalEmpresaRequest) {
    this.ultimoGuardarRequest = request;

    return this.guardarConfiguracionResponse ?? of({
      ...crearConfiguracionFiscalResponse(),
      ruc: request.ruc,
      razonSocial: request.razonSocial,
      nombreComercial: request.nombreComercial ?? '',
      ubigeo: request.ubigeo,
      direccion: request.direccion,
      departamento: request.departamento,
      provincia: request.provincia,
      distrito: request.distrito,
      activa: request.activa,
    });
  }
}

function crearConfiguracionFiscalResponse(): ConfiguracionFiscalEmpresa {
  return {
    empresaId: 'empresa-1',
    ruc: '20601234567',
    razonSocial: 'CapitalPOS SAC',
    nombreComercial: 'CapitalPOS',
    ubigeo: '150101',
    direccion: 'Av. Demo 123',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: 'Lima',
    activa: true,
    fechaCreacion: '2026-07-11T00:00:00Z',
  };
}
