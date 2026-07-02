import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-configuracion-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Configuración"
      description="Pantalla base para la futura configuración del sistema."
    />
  `,
})
export class ConfiguracionPageComponent {}
