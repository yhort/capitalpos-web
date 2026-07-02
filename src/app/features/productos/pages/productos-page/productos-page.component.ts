import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-productos-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Productos"
      description="Pantalla base para la futura administración de productos."
    />
  `,
})
export class ProductosPageComponent {}
