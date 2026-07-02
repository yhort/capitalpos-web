import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-caja-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Caja"
      description="Pantalla base para la futura gestión de caja y movimientos."
    />
  `,
})
export class CajaPageComponent {}
