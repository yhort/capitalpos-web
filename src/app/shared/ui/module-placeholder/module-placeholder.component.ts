import { Component, input } from '@angular/core';

@Component({
  selector: 'app-module-placeholder',
  imports: [],
  templateUrl: './module-placeholder.component.html',
  styleUrl: './module-placeholder.component.scss',
})
export class ModulePlaceholderComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly statusText = input('En construcción');
}
