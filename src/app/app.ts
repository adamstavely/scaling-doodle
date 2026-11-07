import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HeaderNav, SegmentedControl, SideNav } from '@adamstavely/trenchcoat/angular';
import type { SegmentValueChange } from '@adamstavely/trenchcoat/segmented-control';
import type { SideNavItem, SideNavNavigate } from '@adamstavely/trenchcoat/side-nav';
import { icon } from './core/icons';
import { Session, VIEW_AS, ViewAs } from './core/session';

/** Which nav item a URL belongs to; topic pages are reached from the dashboard. */
function navIdFor(url: string): string {
  const path = url.split(/[?#]/)[0];
  if (path.startsWith('/papers')) return 'papers';
  if (path.startsWith('/org')) return 'org';
  if (path.startsWith('/people')) return 'people';
  return 'dashboard';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderNav, SegmentedControl, SideNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly session = inject(Session);
  readonly #router = inject(Router);

  protected readonly navItems: SideNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: icon('dashboard') },
    { id: 'papers', label: 'Papers & Impact', href: '/papers', icon: icon('papers') },
    { id: 'org', label: 'Centers & Teams', href: '/org', icon: icon('org') },
    { id: 'people', label: 'People', href: '/people', icon: icon('people') },
  ];

  protected readonly currentNav = toSignal(
    this.#router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => navIdFor(e.urlAfterRedirects)),
    ),
    { initialValue: navIdFor(this.#router.url) },
  );

  protected readonly viewOptions = (Object.keys(VIEW_AS) as ViewAs[]).map((value) => ({
    value,
    label: VIEW_AS[value].label,
  }));

  protected readonly user = computed(() => {
    const me = this.session.me.value();
    return { name: me?.name ?? '', email: me?.title ?? '' };
  });

  /** Plain clicks go through the router; tc-side-nav leaves modifier and middle clicks to the browser. */
  protected onNavigate(event: CustomEvent<SideNavNavigate>): void {
    if (!event.detail.href) return;
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.href);
  }

  protected onViewChange(event: CustomEvent<SegmentValueChange>): void {
    this.session.setViewAs(event.detail.value as ViewAs);
  }
}
