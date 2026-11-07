import { Component } from '@angular/core';
import { PlaceholderPage } from '../placeholder-page';

@Component({
  selector: 'app-people-page',
  imports: [PlaceholderPage],
  template: `<app-placeholder-page heading="People" />`,
})
export class PeoplePage {}
