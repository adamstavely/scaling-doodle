import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppPicker } from '@adamstavely/trenchcoat/angular/app-picker';
import { HeaderBrand } from '@adamstavely/trenchcoat/angular/header-brand';
import { HeaderNav } from '@adamstavely/trenchcoat/angular/header-nav';
import { LookProvider } from '@adamstavely/trenchcoat/angular/look-provider';
import { Notifications } from '@adamstavely/trenchcoat/angular/notifications';
import { SideNav } from '@adamstavely/trenchcoat/angular/side-nav';
import type { HeaderNavAccountSelect } from '@adamstavely/trenchcoat/header-nav';
import { profileMenuIcon, type ProfileMenuItem } from '@adamstavely/trenchcoat/profile-menu';
import type { SideNavItem, SideNavNavigate } from '@adamstavely/trenchcoat/side-nav';
import { Apps } from './core/apps';
import { icon } from './core/icons';
import { ThemeService } from './core/theme';
import { SearchBox } from './features/search/search-box';
import { Session, VIEW_AS, ViewAs } from './core/session';
import { read } from './core/scoped-resource';

const THEME_ITEM = 'theme';

/** The logo drawn for a navy background, which the side nav always is (see app.css). */
function brandLogo(): HTMLImageElement {
  const img = document.createElement('img');
  img.src = '/brand/logo-dark.png';
  img.alt = '';
  img.width = 28;
  img.height = 28;
  return img;
}

/** Which nav item a URL belongs to; a topic's page sits under Research Topics. */
function navIdFor(url: string): string {
  const path = url.split(/[?#]/)[0];
  if (path.startsWith('/topics')) return 'topics';
  if (path.startsWith('/gaps')) return 'gaps';
  if (path.startsWith('/resourcing')) return 'resourcing';
  if (path.startsWith('/papers')) return 'papers';
  if (path.startsWith('/partners')) return 'partners';
  if (path.startsWith('/org') || path.startsWith('/centers')) return 'org';
  if (path.startsWith('/people')) return 'people';
  return 'dashboard';
}

/** Phones and narrow windows: the shell reflows (see app.css). */
const NARROW = '(max-width: 640px)';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LookProvider, HeaderBrand, HeaderNav, Notifications, AppPicker, SideNav, SearchBox],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly apps = inject(Apps);
  readonly #theme = inject(ThemeService);
  readonly #router = inject(Router);

  /**
   * The side nav folds to its icon rail on narrow screens (and opens again on wide ones), so the page keeps its width;
   * the collapse button still toggles it in between.
   */
  readonly #narrow = matchMedia(NARROW);
  protected readonly navCollapsed = signal(this.#narrow.matches);
  readonly #followWidth = this.#narrow.addEventListener('change', (e) => this.navCollapsed.set(e.matches));

  protected onNavCollapsed(event: CustomEvent<{ collapsed: boolean }>): void {
    this.navCollapsed.set(event.detail.collapsed);
  }

  /** tc-side-nav keeps the logo in the collapsed rail too. */
  protected readonly brandIcon = brandLogo();

  protected readonly navItems: SideNavItem[] = [
    // The mockup's order.
    { id: 'dashboard', label: 'Summary', href: '/', icon: icon('dashboard') },
    { id: 'org', label: 'Centers & Teams', href: '/org', icon: icon('org') },
    { id: 'topics', label: 'Research Topics', href: '/topics', icon: icon('topics') },
    { id: 'gaps', label: 'Gaps & Coverage', href: '/gaps', icon: icon('gaps') },
    { id: 'resourcing', label: 'Resourcing', href: '/resourcing', icon: icon('resourcing') },
    { id: 'papers', label: 'Papers & Impact', href: '/papers', icon: icon('papers') },
    { id: 'partners', label: 'Partner Labs', href: '/partners', icon: icon('partners') },
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
    // A switch: the card stays open while it's flipped.
    { id: THEME_ITEM, label: 'Dark mode', icon: profileMenuIcon('moon'), checked: this.#theme.theme() === 'dark' },
  ]);

  protected readonly user = computed(() => {
    const me = read(this.session.me);
    return { name: me?.name ?? '', email: me?.title ?? '' };
  });

  /** Plain clicks go through the router; tc-side-nav leaves modifier and middle clicks to the browser. */
  protected onNavigate(event: CustomEvent<SideNavNavigate>): void {
    if (!event.detail.href) return;
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.href);
  }

  /** The brand goes home through the router rather than reloading the page. */
  protected onBrandNavigate(event: CustomEvent<{ href: string }>): void {
    event.preventDefault();
    void this.#router.navigateByUrl(event.detail.href);
  }

  protected onAccountSelect(event: CustomEvent<HeaderNavAccountSelect>): void {
    const id = event.detail.id;
    if (id === THEME_ITEM) this.#theme.set(event.detail.checked ? 'dark' : 'light');
    else if (id in VIEW_AS) this.session.setViewAs(id as ViewAs);
  }
}
