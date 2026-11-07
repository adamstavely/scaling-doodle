import { Component } from '@angular/core';
import { PlaceholderPage } from '../placeholder-page';

@Component({
  selector: 'app-dashboard-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page heading="Portfolio Health" />`,
})
export class DashboardPage {}
