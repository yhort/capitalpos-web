import { Component } from '@angular/core';

import { ModulePlaceholderComponent } from '../../../../shared/ui/module-placeholder/module-placeholder.component';

@Component({
  selector: 'app-reportes-page',
  imports: [ModulePlaceholderComponent],
  template: `
    <app-module-placeholder
      title="Reportes"
      description="Pantalla base para futuros reportes comerciales y operativos."
    />
  `,
})
export class ReportesPageComponent {}
