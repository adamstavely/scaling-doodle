import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppPicker } from '@adamstavely/trenchcoat/angular/app-picker';
import { HeaderNav } from '@adamstavely/trenchcoat/angular/header-nav';
import { Notifications } from '@adamstavely/trenchcoat/angular/notifications';
import { SideNav } from '@adamstavely/trenchcoat/angular/side-nav';
import type { HeaderNavAccountSelect } from '@adamstavely/trenchcoat/header-nav';
import type { ProfileMenuItem } from '@adamstavely/trenchcoat/profile-menu';
import type { SideNavItem, SideNavNavigate } from '@adamstavely/trenchcoat/side-nav';
import { Apps } from './core/apps';
import { icon } from './core/icons';
import { ThemeService } from './core/theme';
import { Session, VIEW_AS, ViewAs } from './core/session';

const THEME_ITEM = 'theme';

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
  imports: [RouterOutlet, HeaderNav, Notifications, AppPicker, SideNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly apps = inject(Apps);
  readonly #theme = inject(ThemeService);
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

  /** The account card switches between the Chief's and a PI's view (the current one marked), and light and dark. */
  protected readonly accountItems = computed<ProfileMenuItem[]>(() => [
    ...(Object.keys(VIEW_AS) as ViewAs[]).map((value) => ({
      id: value,
      label: VIEW_AS[value].label,
      badge: this.session.viewAs() === value ? 'Current' : undefined,
    })),
    { id: THEME_ITEM, label: 'Dark mode', badge: this.#theme.theme() === 'dark' ? 'On' : 'Off' },
  ]);

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

  protected onAccountSelect(event: CustomEvent<HeaderNavAccountSelect>): void {
    const id = event.detail.id;
    if (id === THEME_ITEM) this.#theme.toggle();
    else if (id in VIEW_AS) this.session.setViewAs(id as ViewAs);
  }
}
