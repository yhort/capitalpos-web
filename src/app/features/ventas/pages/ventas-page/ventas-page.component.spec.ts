import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EmpresaActivaService } from '../../../../core/empresa/empresa-activa.service';
import { ApiResponse } from '../../../cpe/models/api-response.model';
import { CpeEmisionResponse } from '../../../cpe/models/cpe-emision-response.model';
import { StockApiService } from '../../../inventario/data-access/stock-api.service';
import { StockProductoResponse } from '../../../inventario/models/stock.model';
import { ProductosApiService } from '../../../productos/data-access/productos-api.service';
import { ProductoPresentacionResponse, ProductoVarianteResponse } from '../../../productos/models/producto.model';
import { SedesApiService } from '../../../sedes/data-access/sedes-api.service';
import { PuntoVentaResponse, SedeResponse } from '../../../sedes/models/sede.model';
import { PosApiService } from '../../data-access/pos-api.service';
import { ClienteResponse } from '../../models/cliente.model';
import { ProductoResponse } from '../../models/producto.model';
import { CrearVentaRequest, EmitirCpeDesdeVentaRequest, VentaResponse } from '../../models/venta.model';
import { obtenerFechaActualLima, VentasPageComponent } from './ventas-page.component';

describe('VentasPageComponent', () => {
  let fixture: ComponentFixture<VentasPageComponent>;
  let component: VentasPageComponent;
  let posApi: PosApiServiceFake;
  let productosApi: ProductosApiServiceFake;
  let stockApi: StockApiServiceFake;
  let sedesApi: SedesApiServiceFake;

  beforeEach(async () => {
    posApi = new PosApiServiceFake();
    productosApi = new ProductosApiServiceFake();
    stockApi = new StockApiServiceFake();
    sedesApi = new SedesApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [VentasPageComponent],
      providers: [
        {
          provide: PosApiService,
          useValue: posApi,
        },
        {
          provide: ProductosApiService,
          useValue: productosApi,
        },
        {
          provide: StockApiService,
          useValue: stockApi,
        },
        {
          provide: SedesApiService,
          useValue: sedesApi,
        },
        {
          provide: EmpresaActivaService,
          useValue: {
            empresaId: () => 'empresa-1',
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function crearComponente(): Promise<void> {
    fixture = TestBed.createComponent(VentasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads products and clients', async () => {
    await crearComponente();

    expect(fixture.nativeElement.textContent).toContain('Polo');
    expect(fixture.nativeElement.textContent).toContain('Cliente Test');
  });

  it('loads sedes and autoselects the only active sede and point of sale', async () => {
    await crearComponente();

    expect(sedesApi.listarSedesCalls).toBe(1);
    expect(sedesApi.listarPuntosVentaCalls.get('sede-1')).toBe(1);
    expect(component['ventaForm'].controls.sedeId.value).toBe('sede-1');
    expect(component['ventaForm'].controls.puntoVentaId.value).toBe('punto-1');
    expect(fixture.nativeElement.textContent).toContain('Tienda Central - Cod. 0001');
    expect(fixture.nativeElement.textContent).toContain('Caja Principal');
  });

  it('loads puntos de venta when sede changes', async () => {
    sedesApi.sedes = [
      crearSedeResponse({ id: 'sede-1', nombre: 'Tienda Central' }),
      crearSedeResponse({ id: 'sede-2', nombre: 'Tienda Norte', codigoEstablecimiento: '0002' }),
    ];
    sedesApi.puntosVentaPorSede.set('sede-2', [
      crearPuntoVentaResponse({ id: 'punto-2', sedeId: 'sede-2', nombre: 'Caja Norte' }),
    ]);
    await crearComponente();

    component['ventaForm'].patchValue({ sedeId: 'sede-2' });
    component['alCambiarSede']();

    expect(sedesApi.listarPuntosVentaCalls.get('sede-2')).toBe(1);
    expect(component['ventaForm'].controls.puntoVentaId.value).toBe('punto-2');
  });

  it('shows product stock in the POS catalog', async () => {
    await crearComponente();

    const textContent = fixture.nativeElement.textContent;

    expect(stockApi.obtenerStockProductoCalls.get('producto-1')).toBe(1);
    expect(textContent).toContain('Stock libre');
    expect(textContent).toContain('5');
  });

  it('calculates the default sale date with Lima timezone when UTC is already the next day', () => {
    const fechaUtcDiaSiguiente = new Date('2026-07-13T02:30:00.000Z');

    expect(obtenerFechaActualLima(fechaUtcDiaSiguiente)).toBe('2026-07-12');
  });

  it('shows Lima date in the sale date form by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T02:30:00.000Z'));

    await crearComponente();

    const fechaInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

    expect(component['ventaForm'].controls.fecha.value).toBe('2026-07-12');
    expect(fechaInput.value).toBe('2026-07-12');
  });

  it('allows sales request models with commercial dimensions', () => {
    const request: CrearVentaRequest = {
      fecha: null,
      clienteId: null,
      canalVenta: 'OFERTAS',
      puntoVentaId: 'punto-1',
      vendedorId: null,
      detalles: [],
    };

    expect(request.canalVenta).toBe('OFERTAS');
  });

  it('shows commercial channel selector with TIENDA by default', async () => {
    await crearComponente();

    const channelSelect = fixture.nativeElement.querySelector('select[formcontrolname="canalVenta"]') as HTMLSelectElement;

    expect(channelSelect).toBeTruthy();
    expect(component['ventaForm'].controls.canalVenta.value).toBe('TIENDA');
    expect(channelSelect.value).toBe('TIENDA');
    expect(fixture.nativeElement.textContent).toContain('Canal: Tienda');
    expect(Array.from(channelSelect.options).map((option) => option.value)).toEqual([
      'TIENDA',
      'PROVINCIA',
      'MARKETING',
      'MAYORISTA',
      'MAQUILA',
      'OFERTAS',
    ]);
  });

  it('shows a clear path to create products when the catalog is empty', async () => {
    posApi.productos = [];

    await crearComponente();

    const textContent = fixture.nativeElement.textContent;
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(textContent).toContain('No hay productos activos para vender.');
    expect(textContent).toContain('Crea al menos un producto activo antes de registrar ventas.');
    expect(textContent).toContain('Crear producto');
    expect(links.some((link) => link.getAttribute('href')?.endsWith('/app/productos'))).toBe(true);
  });

  it('adds products and registers a sale with calculated totals', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 2,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toEqual({
      fecha: expect.any(String),
      clienteId: null,
      canalVenta: 'TIENDA',
      puntoVentaId: 'punto-1',
      vendedorId: null,
      detalles: [
        {
          productoId: 'producto-1',
          productoVarianteId: null,
          productoPresentacionId: null,
          cantidad: 2,
          precioUnitario: 11.8,
          igv: 3.6,
          total: 23.6,
        },
      ],
    });
    expect(component['ultimaVenta']()?.id).toBe('venta-1');
    expect(component['mensaje']()).toContain('Venta registrada correctamente.');
  });

  it('sends PROVINCIA commercial channel when registering a sale', async () => {
    await crearComponente();

    component['ventaForm'].patchValue({ canalVenta: 'PROVINCIA' });
    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toEqual(expect.objectContaining({
      canalVenta: 'PROVINCIA',
      puntoVentaId: 'punto-1',
      vendedorId: null,
    }));
  });

  it('sends MARKETING commercial channel when registering a sale', async () => {
    await crearComponente();

    component['ventaForm'].patchValue({ canalVenta: 'MARKETING' });
    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toEqual(expect.objectContaining({
      canalVenta: 'MARKETING',
    }));
  });

  it('keeps adding and selling products without variants as before', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest?.detalles).toEqual([
      expect.objectContaining({
        productoId: 'producto-1',
        productoVarianteId: null,
        productoPresentacionId: null,
        cantidad: 1,
      }),
    ]);
  });

  it('loads presentations when products are loaded and shows the presentation selector', async () => {
    productosApi.presentaciones.set('producto-1', [crearPresentacionResponse()]);

    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
    });
    fixture.detectChanges();

    const presentationSelect = fixture.nativeElement.querySelector(
      'select[formcontrolname="productoPresentacionId"]',
    ) as HTMLSelectElement;

    expect(productosApi.listarPresentacionesCalls.get('producto-1')).toBe(1);
    expect(presentationSelect).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('UND - Unidad - factor 1 - S/ 11.80');
  });

  it('loads active variants and does not add variant products without selecting one', async () => {
    posApi.productos = [
      ...posApi.productos,
      crearProductoResponse({
        id: 'producto-2',
        nombre: 'Polo Brooklyn',
        codigoSku: 'POL-BRO',
      }),
    ];
    productosApi.variantes.set('producto-2', [
      crearVarianteResponse({
        id: 'variante-1',
        productoId: 'producto-2',
        talla: 'M',
        color: 'Negro',
        codigoSku: 'POL-BRO-NEG-M',
      }),
      crearVarianteResponse({
        id: 'variante-2',
        productoId: 'producto-2',
        talla: 'S',
        color: 'Blanco',
        codigoSku: 'POL-BRO-BLA-S',
        activo: false,
      }),
    ]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      cantidad: 1,
    });
    component['agregarProducto']();

    expect(productosApi.listarVariantesCalls.get('producto-2')).toBe(1);
    expect(component['obtenerVariantesActivas']('producto-2').map((variante) => variante.id)).toEqual(['variante-1']);
    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Selecciona una variante o presentación antes de agregar el producto.');
  });

  it('queries variant stock when selecting a variant', async () => {
    posApi.productos = [
      crearProductoResponse({
        id: 'producto-2',
        nombre: 'Polo Brooklyn',
      }),
    ];
    productosApi.variantes.set('producto-2', [crearVarianteResponse()]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
    });
    component['alCambiarVariante']();

    expect(stockApi.obtenerStockProductoVarianteCalls.get('producto-2:variante-1')).toBe(1);
    expect(stockApi.ultimaSedeId).toBe('sede-1');
    expect(component['obtenerStockLibreVariante']('producto-2', 'variante-1')).toBe(4);
  });

  it('uses sedeId when loading base product stock', async () => {
    await crearComponente();

    expect(stockApi.obtenerStockProductoSedes.get('producto-1')).toBe('sede-1');
  });

  it('does not add products when sede is missing', async () => {
    await crearComponente();
    component['ventaForm'].patchValue({ sedeId: '' });

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Indica la sede antes de agregar productos.');
  });

  it('does not register a sale when puntoVentaId is missing', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['agregarProducto']();
    component['ventaForm'].patchValue({ puntoVentaId: '' });
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toBeNull();
    expect(component['mensaje']()).toBe('Indica el punto de venta antes de registrar la venta.');
  });

  it('does not add selected variants without free stock', async () => {
    posApi.productos = [crearProductoResponse({ id: 'producto-2' })];
    productosApi.variantes.set('producto-2', [crearVarianteResponse()]);
    stockApi.stocksVariantes.set('producto-2:variante-1', crearStockResponse({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidadDisponible: 0,
      stockLibre: 0,
    }));
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidad: 1,
    });
    component['alCambiarVariante']();
    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('La variante seleccionada no tiene stock disponible.');
  });

  it('does not add selected variants when quantity exceeds variant free stock', async () => {
    posApi.productos = [crearProductoResponse({ id: 'producto-2' })];
    productosApi.variantes.set('producto-2', [crearVarianteResponse()]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidad: 5,
    });
    component['alCambiarVariante']();
    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Stock insuficiente para la variante seleccionada.');
  });

  it('shows selected variant details in the cart and sends productoVarianteId when selling', async () => {
    posApi.productos = [
      crearProductoResponse({
        id: 'producto-2',
        nombre: 'Polo Brooklyn',
        precioVenta: 20,
      }),
    ];
    productosApi.variantes.set('producto-2', [crearVarianteResponse({
      color: 'Negro',
      talla: 'M',
      codigoSku: 'POL-BRO-NEG-M',
      codigoBarras: '775000000002',
    })]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidad: 2,
    });
    component['alCambiarVariante']();
    component['agregarProducto']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Polo Brooklyn - Negro / M - SKU POL-BRO-NEG-M - CB 775000000002');

    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest?.detalles).toEqual([
      expect.objectContaining({
        productoId: 'producto-2',
        productoVarianteId: 'variante-1',
        productoPresentacionId: null,
        cantidad: 2,
      }),
    ]);
  });

  it('adds a product with presentation and sends productoPresentacionId when selling', async () => {
    productosApi.presentaciones.set('producto-1', [
      crearPresentacionResponse({
        id: 'presentacion-docena',
        unidadCodigo: 'DOC',
        unidadNombre: 'Docena',
        factorConversion: 12,
        precioVenta: 120,
        codigoBarras: '775000000120',
      }),
    ]);
    stockApi.stocks.set('producto-1', crearStockResponse({
      cantidadDisponible: 30,
      stockLibre: 30,
    }));
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      productoPresentacionId: 'presentacion-docena',
      cantidad: 1,
    });

    component['agregarProducto']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Polo - DOC - Docena - factor 12 - S/ 120.00 - CB 775000000120');
    expect(fixture.nativeElement.textContent).toContain('consumo 12');

    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest?.detalles).toEqual([
      expect.objectContaining({
        productoId: 'producto-1',
        productoVarianteId: null,
        productoPresentacionId: 'presentacion-docena',
        cantidad: 1,
        precioUnitario: 120,
        total: 120,
      }),
    ]);
  });

  it('keeps base product sales without presentation as before', async () => {
    productosApi.presentaciones.set('producto-1', [crearPresentacionResponse()]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      productoPresentacionId: '',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest?.detalles).toEqual([
      expect.objectContaining({
        productoId: 'producto-1',
        productoVarianteId: null,
        productoPresentacionId: null,
      }),
    ]);
  });

  it('allows selling a variant with presentation and sends both identifiers', async () => {
    posApi.productos = [crearProductoResponse({
      id: 'producto-2',
      nombre: 'Polo Brooklyn',
      precioVenta: 20,
    })];
    productosApi.variantes.set('producto-2', [crearVarianteResponse()]);
    productosApi.presentaciones.set('producto-2', [
      crearPresentacionResponse({
        id: 'presentacion-pack',
        productoId: 'producto-2',
        unidadCodigo: 'PACK',
        unidadNombre: 'Pack',
        factorConversion: 2,
        precioVenta: 38,
      }),
    ]);
    stockApi.stocksVariantes.set('producto-2:variante-1', crearStockResponse({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidadDisponible: 8,
      stockLibre: 8,
    }));
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      productoPresentacionId: 'presentacion-pack',
      cantidad: 2,
    });
    component['alCambiarVariante']();
    component['agregarProducto']();
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest?.detalles).toEqual([
      expect.objectContaining({
        productoId: 'producto-2',
        productoVarianteId: 'variante-1',
        productoPresentacionId: 'presentacion-pack',
        cantidad: 2,
        precioUnitario: 38,
      }),
    ]);
  });

  it('blocks obvious stock errors when presentation factor exceeds free stock', async () => {
    productosApi.presentaciones.set('producto-1', [
      crearPresentacionResponse({
        id: 'presentacion-caja',
        factorConversion: 3,
        precioVenta: 30,
      }),
    ]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      productoPresentacionId: 'presentacion-caja',
      cantidad: 2,
    });

    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Stock insuficiente para la cantidad solicitada.');
    expect(posApi.ultimaVentaRequest).toBeNull();
  });

  it('shows backend stock errors for presentation sales without clearing the cart', async () => {
    productosApi.presentaciones.set('producto-1', [crearPresentacionResponse()]);
    await crearComponente();
    posApi.crearVentaError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Stock insuficiente para la presentacion seleccionada.',
      },
    });

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      productoPresentacionId: 'presentacion-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(component['items']().length).toBe(1);
    expect(component['mensaje']()).toBe('Stock insuficiente para la presentacion seleccionada.');
  });

  it('refreshes sold variant stock after registering a sale successfully', async () => {
    posApi.productos = [crearProductoResponse({ id: 'producto-2' })];
    productosApi.variantes.set('producto-2', [crearVarianteResponse()]);
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidad: 1,
    });
    component['alCambiarVariante']();
    component['agregarProducto']();
    component['registrarVenta']();

    expect(stockApi.obtenerStockProductoVarianteCalls.get('producto-2:variante-1')).toBe(2);
    expect(component['items']()).toEqual([]);
  });

  it('does not add products without free stock', async () => {
    stockApi.stocks.set('producto-1', crearStockResponse({
      cantidadDisponible: 0,
      cantidadReservada: 0,
      stockLibre: 0,
    }));
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Sin stock disponible.');
  });

  it('does not add products when requested quantity is greater than free stock', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 6,
    });

    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Stock insuficiente para la cantidad solicitada.');
  });

  it('does not sell products when stock could not be loaded', async () => {
    stockApi.productosConError.add('producto-1');
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();

    expect(component['items']()).toEqual([]);
    expect(component['mensaje']()).toBe('Stock no disponible para este producto.');
  });

  it('does not discount stock locally when adding products to the cart', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 2,
    });

    component['agregarProducto']();

    expect(component['items']().length).toBe(1);
    expect(component['obtenerStockLibre']('producto-1')).toBe(5);
  });

  it('refreshes sold product stock after registering a sale successfully', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 2,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(stockApi.obtenerStockProductoCalls.get('producto-1')).toBe(2);
    expect(component['items']()).toEqual([]);
  });

  it('shows backend stock errors without clearing the cart', async () => {
    await crearComponente();
    posApi.crearVentaError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Stock insuficiente para la cantidad solicitada.',
      },
    });

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 2,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(component['items']().length).toBe(1);
    expect(component['mensaje']()).toBe('Stock insuficiente para la cantidad solicitada.');
  });

  it('shows backend invalid channel errors without clearing the cart', async () => {
    await crearComponente();
    posApi.crearVentaError = new HttpErrorResponse({
      status: 400,
      error: {
        mensaje: 'Canal de venta invalido.',
      },
    });

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['registrarVenta']();

    expect(component['items']().length).toBe(1);
    expect(component['mensaje']()).toBe('Canal de venta invalido.');
  });

  it('does not register twice while a sale is already being saved', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });

    component['agregarProducto']();
    component['estado'].set('guardando');
    component['registrarVenta']();

    expect(posApi.ultimaVentaRequest).toBeNull();
  });

  it('emits CPE from the last registered sale', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['emisionForm'].patchValue({
      rucEmisor: '20123456789',
    });

    component['agregarProducto']();
    component['registrarVenta']();
    component['emitirComprobante']();

    expect(posApi.ultimaEmisionVentaId).toBe('venta-1');
    expect(posApi.ultimaEmisionRequest).toEqual({
      tipoComprobante: '03',
      serie: 'B001',
      correlativo: 1,
      rucEmisor: '20123456789',
    });
    expect(component['emisionEstado']()).toBe('exito');
    expect(component['emisionRespuesta']()?.estado).toBe('SIMULADO');
  });

  it('does not show editable serie or correlativo fields for CPE emission', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['agregarProducto']();
    component['registrarVenta']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[formcontrolname="serie"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formcontrolname="correlativo"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'La serie y correlativo se asignan automáticamente según la sede seleccionada.',
    );
  });

  it('emits CPE with compatibility serie and correlativo without user intervention', async () => {
    await crearComponente();

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['emisionForm'].patchValue({
      serie: '',
      correlativo: 0,
      rucEmisor: '20123456789',
    });

    component['agregarProducto']();
    component['registrarVenta']();
    component['emitirComprobante']();

    expect(posApi.ultimaEmisionRequest).toEqual({
      tipoComprobante: '03',
      serie: 'B001',
      correlativo: 1,
      rucEmisor: '20123456789',
    });
    expect(component['emisionEstado']()).toBe('exito');
  });

  it('shows backend errors when the sale sede has no active comprobante series', async () => {
    await crearComponente();
    posApi.emitirCpeError = new HttpErrorResponse({
      status: 400,
      error: {
        ok: false,
        mensaje: 'No existe serie activa para la sede seleccionada.',
        data: null,
        errores: ['Configura una serie activa para emitir el comprobante.'],
      },
    });

    component['productoForm'].patchValue({
      productoId: 'producto-1',
      cantidad: 1,
    });
    component['emisionForm'].patchValue({
      rucEmisor: '20123456789',
    });

    component['agregarProducto']();
    component['registrarVenta']();
    component['emitirComprobante']();

    expect(component['emisionEstado']()).toBe('error-validacion');
    expect(component['emisionMensaje']()).toBe('No existe serie activa para la sede seleccionada.');
    expect(component['emisionErrores']()).toContain('Configura una serie activa para emitir el comprobante.');
  });
});

class SedesApiServiceFake {
  listarSedesCalls = 0;
  readonly listarPuntosVentaCalls = new Map<string, number>();
  sedes: readonly SedeResponse[] = [crearSedeResponse()];
  readonly puntosVentaPorSede = new Map<string, readonly PuntoVentaResponse[]>([
    ['sede-1', [crearPuntoVentaResponse()]],
  ]);

  listarSedes() {
    this.listarSedesCalls += 1;
    return of(this.sedes);
  }

  listarPuntosVenta(sedeId: string) {
    this.listarPuntosVentaCalls.set(
      sedeId,
      (this.listarPuntosVentaCalls.get(sedeId) ?? 0) + 1,
    );

    return of(this.puntosVentaPorSede.get(sedeId) ?? []);
  }
}

class PosApiServiceFake {
  ultimaVentaRequest: CrearVentaRequest | null = null;
  ultimaEmisionVentaId: string | null = null;
  ultimaEmisionRequest: EmitirCpeDesdeVentaRequest | null = null;
  crearVentaError: HttpErrorResponse | null = null;
  emitirCpeError: HttpErrorResponse | null = null;
  productos: readonly ProductoResponse[] = [
    {
      id: 'producto-1',
      empresaId: 'empresa-1',
      nombre: 'Polo',
      codigoSku: 'POLO-001',
      codigoBarras: '',
      precioVenta: 11.8,
      costo: null,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    },
  ];
  clientes: readonly ClienteResponse[] = [
    {
      id: 'cliente-1',
      empresaId: 'empresa-1',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombreRazonSocial: 'Cliente Test',
      direccion: '',
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    },
  ];

  listarProductos() {
    return of(this.productos);
  }

  listarClientes() {
    return of(this.clientes);
  }

  crearCliente() {
    throw new Error('Not implemented in this test.');
  }

  crearVenta(request: CrearVentaRequest) {
    this.ultimaVentaRequest = request;

    if (this.crearVentaError) {
      return throwError(() => this.crearVentaError);
    }

    return of<VentaResponse>({
      id: 'venta-1',
      empresaId: 'empresa-1',
      sedeId: 'sede-1',
      clienteId: request.clienteId,
      fecha: request.fecha ?? '2026-07-11T00:00:00Z',
      subtotal: 20,
      igv: 3.6,
      total: 23.6,
      estado: 'Registrada',
      canalVenta: request.canalVenta,
      puntoVentaId: request.puntoVentaId,
      vendedorId: request.vendedorId,
      fechaCreacion: '2026-07-11T00:00:00Z',
      detalles: [],
    });
  }

  emitirCpeDesdeVenta(ventaId: string, request: EmitirCpeDesdeVentaRequest) {
    this.ultimaEmisionVentaId = ventaId;
    this.ultimaEmisionRequest = request;

    if (this.emitirCpeError) {
      return throwError(() => this.emitirCpeError);
    }

    return of<ApiResponse<CpeEmisionResponse>>({
      ok: true,
      mensaje: 'Comprobante aceptado en modo simulacion.',
      data: {
        ok: true,
        estado: 'SIMULADO',
        mensaje: 'Comprobante aceptado en modo simulacion.',
        codigo: 'SIMULADO',
        comprobante: 'B001-1',
        hash: 'abc123',
        nombreXml: '20123456789-03-B001-1.xml',
        nombreZip: '20123456789-03-B001-1.zip',
        nombreCdr: 'R-20123456789-03-B001-1.zip',
        errores: [],
      },
      errores: [],
    });
  }
}

class ProductosApiServiceFake {
  readonly listarVariantesCalls = new Map<string, number>();
  readonly listarPresentacionesCalls = new Map<string, number>();
  readonly variantes = new Map<string, readonly ProductoVarianteResponse[]>([
    ['producto-1', []],
  ]);
  readonly presentaciones = new Map<string, readonly ProductoPresentacionResponse[]>([
    ['producto-1', []],
  ]);

  listarVariantes(productoId: string) {
    this.listarVariantesCalls.set(
      productoId,
      (this.listarVariantesCalls.get(productoId) ?? 0) + 1,
    );

    return of(this.variantes.get(productoId) ?? []);
  }

  listarPresentaciones(productoId: string) {
    this.listarPresentacionesCalls.set(
      productoId,
      (this.listarPresentacionesCalls.get(productoId) ?? 0) + 1,
    );

    return of(this.presentaciones.get(productoId) ?? []);
  }
}

class StockApiServiceFake {
  readonly productosConError = new Set<string>();
  readonly obtenerStockProductoCalls = new Map<string, number>();
  readonly obtenerStockProductoSedes = new Map<string, string>();
  readonly obtenerStockProductoVarianteCalls = new Map<string, number>();
  ultimaSedeId: string | null = null;
  readonly stocks = new Map<string, StockProductoResponse>([
    ['producto-1', crearStockResponse()],
  ]);
  readonly stocksVariantes = new Map<string, StockProductoResponse>([
    ['producto-2:variante-1', crearStockResponse({
      productoId: 'producto-2',
      productoVarianteId: 'variante-1',
      cantidadDisponible: 4,
      cantidadReservada: 0,
      stockLibre: 4,
    })],
  ]);

  obtenerStockProducto(productoId: string, sedeId: string) {
    this.obtenerStockProductoCalls.set(
      productoId,
      (this.obtenerStockProductoCalls.get(productoId) ?? 0) + 1,
    );
    this.obtenerStockProductoSedes.set(productoId, sedeId);
    this.ultimaSedeId = sedeId;

    if (this.productosConError.has(productoId)) {
      return throwError(() => new HttpErrorResponse({ status: 404 }));
    }

    return of(this.stocks.get(productoId) ?? crearStockResponse({ productoId }));
  }

  obtenerStockProductoVariante(productoId: string, productoVarianteId: string, sedeId: string) {
    const clave = `${productoId}:${productoVarianteId}`;
    this.obtenerStockProductoVarianteCalls.set(
      clave,
      (this.obtenerStockProductoVarianteCalls.get(clave) ?? 0) + 1,
    );
    this.ultimaSedeId = sedeId;

    return of(this.stocksVariantes.get(clave) ?? crearStockResponse({
      productoId,
      productoVarianteId,
    }));
  }
}

function crearProductoResponse(overrides: Partial<ProductoResponse> = {}): ProductoResponse {
  return {
    id: 'producto-1',
    empresaId: 'empresa-1',
    nombre: 'Polo',
    codigoSku: 'POLO-001',
    codigoBarras: '',
    precioVenta: 11.8,
    costo: null,
    activo: true,
    fechaCreacion: '2026-07-11T00:00:00Z',
    ...overrides,
  };
}

function crearVarianteResponse(overrides: Partial<ProductoVarianteResponse> = {}): ProductoVarianteResponse {
  return {
    id: 'variante-1',
    empresaId: 'empresa-1',
    productoId: 'producto-2',
    talla: 'M',
    color: 'Negro',
    codigoSku: 'POL-BRO-NEG-M',
    codigoBarras: '775000000002',
    activo: true,
    fechaCreacion: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

function crearPresentacionResponse(
  overrides: Partial<ProductoPresentacionResponse> = {},
): ProductoPresentacionResponse {
  return {
    id: 'presentacion-1',
    empresaId: 'empresa-1',
    productoId: 'producto-1',
    productoVarianteId: null,
    unidadMedidaId: 'unidad-1',
    unidadCodigo: 'UND',
    unidadNombre: 'Unidad',
    factorConversion: 1,
    esUnidadBase: true,
    precioVenta: 11.8,
    codigoBarras: null,
    activo: true,
    fechaCreacion: '2026-07-20T10:00:00Z',
    ...overrides,
  };
}

function crearStockResponse(overrides: Partial<StockProductoResponse> = {}): StockProductoResponse {
  return {
    empresaId: 'empresa-1',
    sedeId: 'sede-1',
    productoId: 'producto-1',
    productoVarianteId: null,
    cantidadDisponible: 5,
    cantidadReservada: 0,
    stockLibre: 5,
    fechaActualizacion: '2026-07-14T10:00:00Z',
    ...overrides,
  };
}

function crearSedeResponse(overrides: Partial<SedeResponse> = {}): SedeResponse {
  return {
    id: 'sede-1',
    empresaId: 'empresa-1',
    nombre: 'Tienda Central',
    tipo: 'TIENDA',
    codigoEstablecimiento: '0001',
    direccion: 'Av. Lima 123',
    distrito: 'Lima',
    provincia: 'Lima',
    departamento: 'Lima',
    activa: true,
    fechaCreacion: '2026-07-18T10:00:00Z',
    ...overrides,
  };
}

function crearPuntoVentaResponse(overrides: Partial<PuntoVentaResponse> = {}): PuntoVentaResponse {
  return {
    id: 'punto-1',
    empresaId: 'empresa-1',
    sedeId: 'sede-1',
    nombre: 'Caja Principal',
    activo: true,
    ...overrides,
  };
}
