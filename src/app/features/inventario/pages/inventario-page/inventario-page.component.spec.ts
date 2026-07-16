import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoResponse, ProductoVarianteResponse } from '../../../productos/models/producto.model';
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

  it('shows product name and SKU instead of GUID as the main selector text', async () => {
    await crearComponente();

    const productSelect = fixture.nativeElement.querySelector('select[formcontrolname="productoId"]') as HTMLSelectElement;
    const optionTexts = Array.from(productSelect.options).map((option) => option.textContent?.trim());

    expect(optionTexts).toContain('Polo demo - POLO-001');
    expect(optionTexts).not.toContain('producto-1');
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

  it('loads variants when product changes', async () => {
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();

    expect(productosApi.ultimoListarVariantesProductoId).toBe('producto-1');
  });

  it('shows active variants in a visual selector', async () => {
    productosApi.variantes.set('producto-1', [
      crearVarianteResponse({
        id: 'variante-1',
        color: 'Negro',
        talla: 'M',
        codigoSku: 'BRO-POLO-NEG-M',
      }),
      crearVarianteResponse({
        id: 'variante-2',
        color: 'Blanco',
        talla: 'S',
        codigoSku: 'BRO-POLO-BLA-S',
        activo: false,
      }),
    ]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    const variantSelect = fixture.nativeElement.querySelector('select[formcontrolname="productoVarianteId"]') as HTMLSelectElement;

    expect(variantSelect).toBeTruthy();
    expect(textContent).toContain('Negro / M - SKU BRO-POLO-NEG-M');
    expect(textContent).not.toContain('Blanco / S - SKU BRO-POLO-BLA-S');
  });

  it('does not consult variant products without selected variant', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    component['consultarStock']();

    expect(stockApi.ultimoProductoId).toBeNull();
    expect(stockApi.ultimaVarianteProductoId).toBeNull();
    expect(component['mensaje']()).toBe('Selecciona una variante para consultar o ajustar stock.');
  });

  it('does not adjust variant products without selected variant', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    component['ajustarStock']();

    expect(stockApi.ultimoAjusteRequest).toBeNull();
    expect(component['mensaje']()).toBe('Selecciona una variante para consultar o ajustar stock.');
  });

  it('consults variant stock when a variant is selected', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    component['consultaForm'].patchValue({
      productoVarianteId: 'variante-1',
    });
    component['consultarStock']();

    expect(stockApi.ultimaVarianteProductoId).toBe('producto-1');
    expect(stockApi.ultimaVarianteId).toBe('variante-1');
  });

  it('consults variant stock automatically when a variant is selected', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    component['consultaForm'].patchValue({
      productoVarianteId: 'variante-1',
    });
    component['alCambiarVariante']();
    fixture.detectChanges();

    expect(stockApi.obtenerStockProductoVarianteCalls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Producto');
    expect(fixture.nativeElement.textContent).toContain('Polo demo - POLO-001');
    expect(fixture.nativeElement.textContent).toContain('Variante');
    expect(fixture.nativeElement.textContent).toContain('Negro / M - SKU BRO-POLO-NEG-M');
  });

  it('disables stock adjustment when a product variant is required but missing', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const adjustButton = buttons.find((button) => button.textContent?.includes('Ajustar stock'));

    expect(fixture.nativeElement.textContent).toContain('Selecciona una variante para consultar o ajustar stock.');
    expect(adjustButton?.disabled).toBe(true);
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
    expect(stockApi.obtenerStockProductoCalls).toBe(1);
    expect(component['stock']()?.cantidadDisponible).toBe(10);
  });

  it('adjusts variant stock with productoVarianteId and refreshes the result', async () => {
    productosApi.variantes.set('producto-1', [crearVarianteResponse()]);
    await crearComponente();

    component['consultaForm'].patchValue({
      productoId: 'producto-1',
    });
    component['alCambiarProducto']();
    component['consultaForm'].patchValue({
      productoVarianteId: 'variante-1',
    });
    component['ajusteForm'].patchValue({
      cantidadDisponible: 18,
    });
    component['ajustarStock']();

    expect(stockApi.ultimoAjusteRequest).toEqual({
      productoId: 'producto-1',
      productoVarianteId: 'variante-1',
      cantidadDisponible: 18,
    });
    expect(stockApi.ultimaVarianteProductoId).toBe('producto-1');
    expect(stockApi.ultimaVarianteId).toBe('variante-1');
    expect(component['mensaje']()).toBe('Stock ajustado correctamente.');
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
  ultimoListarVariantesProductoId: string | null = null;
  readonly variantes = new Map<string, readonly ProductoVarianteResponse[]>([
    ['producto-1', []],
  ]);

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

  listarVariantes(productoId: string) {
    this.ultimoListarVariantesProductoId = productoId;
    return of(this.variantes.get(productoId) ?? []);
  }
}

class StockApiServiceFake {
  ultimoProductoId: string | null = null;
  ultimaVarianteProductoId: string | null = null;
  ultimaVarianteId: string | null = null;
  ultimoAjusteRequest: AjustarStockProductoRequest | null = null;
  ajustarStockResponse: Observable<StockProductoResponse> | null = null;
  obtenerStockProductoCalls = 0;
  obtenerStockProductoVarianteCalls = 0;

  obtenerStockProducto(productoId: string) {
    this.obtenerStockProductoCalls += 1;
    this.ultimoProductoId = productoId;
    return of(crearStockResponse());
  }

  obtenerStockProductoVariante(productoId: string, productoVarianteId: string) {
    this.obtenerStockProductoVarianteCalls += 1;
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

function crearVarianteResponse(overrides: Partial<ProductoVarianteResponse> = {}): ProductoVarianteResponse {
  return {
    id: 'variante-1',
    empresaId: 'empresa-1',
    productoId: 'producto-1',
    talla: 'M',
    color: 'Negro',
    codigoSku: 'BRO-POLO-NEG-M',
    codigoBarras: '775000000001',
    activo: true,
    fechaCreacion: '2026-07-16T10:00:00Z',
    ...overrides,
  };
}
