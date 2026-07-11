import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ProductosApiService } from '../../data-access/productos-api.service';
import { CrearProductoRequest, ProductoResponse } from '../../models/producto.model';
import { ProductosPageComponent } from './productos-page.component';

describe('ProductosPageComponent', () => {
  let fixture: ComponentFixture<ProductosPageComponent>;
  let component: ProductosPageComponent;
  let productosApi: ProductosApiServiceFake;

  beforeEach(async () => {
    productosApi = new ProductosApiServiceFake();

    await TestBed.configureTestingModule({
      imports: [ProductosPageComponent],
      providers: [
        {
          provide: ProductosApiService,
          useValue: productosApi,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductosPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads existing products', () => {
    expect(fixture.nativeElement.textContent).toContain('Polo demo');
  });

  it('creates a basic product and prepends it to the list', () => {
    component['productoForm'].patchValue({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: '',
      costo: null,
    });

    component['crearProducto']();

    expect(productosApi.ultimoCrearProductoRequest).toEqual({
      nombre: 'Casaca demo',
      precioVenta: 120.5,
      codigoSku: 'CAS-001',
      codigoBarras: null,
      costo: null,
      activo: true,
    });
    expect(component['productos']()[0]?.nombre).toBe('Casaca demo');
    expect(component['mensaje']()).toBe('Producto Casaca demo creado.');
  });
});

class ProductosApiServiceFake {
  ultimoCrearProductoRequest: CrearProductoRequest | null = null;

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
        fechaCreacion: '2026-07-11T00:00:00Z',
      },
    ]);
  }

  crearProducto(request: CrearProductoRequest) {
    this.ultimoCrearProductoRequest = request;

    return of<ProductoResponse>({
      id: 'producto-2',
      empresaId: 'empresa-1',
      nombre: request.nombre,
      codigoSku: request.codigoSku ?? '',
      codigoBarras: request.codigoBarras ?? '',
      precioVenta: request.precioVenta,
      costo: request.costo,
      activo: true,
      fechaCreacion: '2026-07-11T00:00:00Z',
    });
  }
}
