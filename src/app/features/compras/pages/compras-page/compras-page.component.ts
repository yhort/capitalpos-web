import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-compras-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Compras"
      description="Pantalla base para la futura gestión de compras y proveedores."
    />
  `,
})
export class ComprasPageComponent {}
