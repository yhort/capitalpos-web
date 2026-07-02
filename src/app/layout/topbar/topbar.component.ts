import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly pageTitle = input('Dashboard');
  readonly userName = input('Usuario');
  readonly notificationCount = input(0);
  readonly menuExpanded = input(false);
  readonly menuControls = input('main-sidebar');

  readonly menuToggle = output<void>();

  onMenuToggle(): void {
    this.menuToggle.emit();
  }
}
