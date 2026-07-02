import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-emitir-cpe-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Emitir CPE"
      description="Pantalla base para la futura emisión de comprobantes electrónicos."
    />
  `,
})
export class EmitirCpePageComponent {}
