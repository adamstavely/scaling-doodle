import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { provideApiConfiguration } from './api/generated/api-configuration';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    }).compileComponents();
  });

  it('renders the main nav', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('tc-side-nav') as
      | (HTMLElement & { items: { label: string }[]; current: string | null })
      | null;
    expect(nav?.items.map((i) => i.label)).toContain('Papers & Impact');
    expect(nav?.current).toBe('dashboard');
  });
});
