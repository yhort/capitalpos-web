import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-inventario-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Inventario"
      description="Pantalla base para la futura consulta de existencias y almacenes."
    />
  `,
})
export class InventarioPageComponent {}
