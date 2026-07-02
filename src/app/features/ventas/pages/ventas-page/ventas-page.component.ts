import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-ventas-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Ventas"
      description="Pantalla base para la futura gestión de ventas comerciales."
    />
  `,
})
export class VentasPageComponent {}
