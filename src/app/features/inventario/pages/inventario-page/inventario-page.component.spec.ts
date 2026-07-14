import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoResponse } from '../../../productos/models/producto.model';
import { StockApiService } from '../../data-access/stock-api.service';
import { AjustarStockProductoRequest, StockProductoResponse } from '../../models/stock.model';
import { InventarioPageComponent } from './inventario-page.component';

describe('InventarioPageComponent', () => {
  let fixture: ComponentFixture<InventarioPageComponent>;
  let component: InventarioPageComponent;
  let productosApi: ProductosApiServiceFake;
  let stockApi: StockApiServiceFake;

  beforeEach(async () => {
    productosApi = new ProductosApiServiceFake();
    stockApi = new StockApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [InventarioPageComponent],
      providers: [
        {
          provide: ProductosApiService,
          useValue: productosApi,
        },
        {
          provide: StockApiService,
          useValue: stockApi,
        },
      ],
    }).compileComponents();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(InventarioPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads products for stock selection', async () => {
    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('1 productos activos');
    expect(component['productos']()[0]?.nombre).toBe('Polo demo');
  });

  it('consults product stock and shows available, reserved and free stock', async () => {
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
      productoVarianteId: '',
    });
    component['consultarStock']();
    fixture.detectChanges();

    expect(stockApi.ultimoProductoId).toBe('producto-1');
    expect(stockApi.ultimaVarianteProductoId).toBeNull();
    expect(component['stock']()?.stockLibre).toBe(8);
    expect(component['ajusteForm'].controls.cantidadDisponible.value).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('Stock consultado correctamente.');
    expect(fixture.nativeElement.textContent).toContain('Cantidad disponible');
    expect(fixture.nativeElement.textContent).toContain('Stock libre');
  });

  it('consults variant stock when variant id is provided', async () => {
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
      productoVarianteId: 'variante-1',
    });
    component['consultarStock']();

    expect(stockApi.ultimaVarianteProductoId).toBe('producto-1');
    expect(stockApi.ultimaVarianteId).toBe('variante-1');
  });

  it('adjusts available stock and refreshes the result', async () => {
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
      productoVarianteId: '',
    });
    component['ajusteForm'].patchValue({
      cantidadDisponible: 15.1234,
    });
    component['ajustarStock']();

    expect(stockApi.ultimoAjusteRequest).toEqual({
      productoId: 'producto-1',
      productoVarianteId: null,
      cantidadDisponible: 15.123,
    });
    expect(component['mensaje']()).toBe('Stock ajustado correctamente.');
    expect(component['stock']()?.cantidadDisponible).toBe(15.123);
  });

  it('shows validation state when product is missing', async () => {
    await crearComponente();

    component['consultarStock']();

    expect(stockApi.ultimoProductoId).toBeNull();
    expect(component['estado']()).toBe('error-validacion');
    expect(component['mensaje']()).toContain('Selecciona o ingresa un producto');
  });

  it('shows backend validation errors while adjusting stock', async () => {
    await crearComponente();
    stockApi.ajustarStockResponse = throwError(() =>
      new HttpErrorResponse({
        status: 400,
        error: {
          mensaje: 'La cantidad disponible no puede ser negativa.',
        },
      }),
    );

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['ajustarStock']();

    expect(component['estado']()).toBe('error-validacion');
    expect(component['mensaje']()).toBe('La cantidad disponible no puede ser negativa.');
  });
});

class ProductosApiServiceFake {
  listarProductos() {
    return of<readonly ProductoResponse[]>([
      {
        id: 'producto-1',
        empresaId: 'empresa-1',
        nombre: 'Polo demo',
        codigoSku: 'POLO-001',
        codigoBarras: '',
        precioVenta: 59.9,
        costo: 25,
        activo: true,
        fechaCreacion: '2026-07-14T00:00:00Z',
      },
    ]);
  }
}

class StockApiServiceFake {
  ultimoProductoId: string | null = null;
  ultimaVarianteProductoId: string | null = null;
  ultimaVarianteId: string | null = null;
  ultimoAjusteRequest: AjustarStockProductoRequest | null = null;
  ajustarStockResponse: Observable<StockProductoResponse> | null = null;

  obtenerStockProducto(productoId: string) {
    this.ultimoProductoId = productoId;
    return of(crearStockResponse());
  }

  obtenerStockProductoVariante(productoId: string, productoVarianteId: string) {
    this.ultimaVarianteProductoId = productoId;
    this.ultimaVarianteId = productoVarianteId;
    return of(crearStockResponse({ productoVarianteId }));
  }

  ajustarStock(request: AjustarStockProductoRequest) {
    this.ultimoAjusteRequest = request;
    return this.ajustarStockResponse ?? of(crearStockResponse({
      cantidadDisponible: request.cantidadDisponible,
      stockLibre: request.cantidadDisponible - 2,
    }));
  }
}

function crearStockResponse(overrides: Partial<StockProductoResponse> = {}): StockProductoResponse {
  return {
    empresaId: 'empresa-1',
    productoId: 'producto-1',
    productoVarianteId: null,
    cantidadDisponible: 10,
    cantidadReservada: 2,
    stockLibre: 8,
    fechaActualizacion: '2026-07-14T10:00:00Z',
    ...overrides,
  };
}
