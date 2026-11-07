import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HeaderNav, SegmentedControl } from '@adamstavely/trenchcoat/angular';
import type { SegmentValueChange } from '@adamstavely/trenchcoat/segmented-control';
import { Session, VIEW_AS, ViewAs } from './core/session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HeaderNav, SegmentedControl],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly session = inject(Session);

  // Temporary until Trench Coat ships its side-nav element (plan step A2); then this list feeds it.
  protected readonly nav = [
    { path: '/', label: 'Dashboard', exact: true },
    { path: '/papers', label: 'Papers & Impact', exact: false },
    { path: '/org', label: 'Centers & Teams', exact: false },
    { path: '/people', label: 'People', exact: false },
  ];

  protected readonly viewOptions = (Object.keys(VIEW_AS) as ViewAs[]).map((value) => ({
    value,
    label: VIEW_AS[value].label,
  }));

  protected readonly user = computed(() => {
    const me = this.session.me.value();
    return { name: me?.name ?? '', email: me?.title ?? '' };
  });

  protected onViewChange(event: CustomEvent<SegmentValueChange>): void {
    this.session.setViewAs(event.detail.value as ViewAs);
  }
}
