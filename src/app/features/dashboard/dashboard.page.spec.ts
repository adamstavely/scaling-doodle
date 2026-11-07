import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/generated/api-configuration';
import { DashboardPage } from './dashboard.page';

const summary = {
  period: { label: 'ytd', from: '2026-01-01', to: '2026-11-07' },
  topics: 12,
  openGaps: 11,
  gapsCovered: 0.363,
  workInFlight: 8,
  papersInPeriod: 2,
  readsInPeriod: 101047,
  healthMix: { healthy: 9, watch: 0, atRisk: 3 },
  readTrend: [{ month: '2026-10', views: 10, downloads: 4 }],
};
const topic = {
  id: 't-neuro',
  name: 'Neuromorphic Computing',
  bin: 1,
  health: 'at-risk',
  momentum: -3,
  trend: [3, 0],
  lead: { id: 'mo', name: 'Marcus Okonkwo', initials: 'MO' },
  stats: { coverage: 0.4, openGaps: 5, work: 4 },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    });
  });

  it('maps the API onto the KPI tiles and priorities', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await Promise.resolve();
    const http = TestBed.inject(HttpTestingController);
    http.match((r) => r.url === '/api/me').forEach((r) => r.flush({ id: 'hv', name: 'Helena Vance' }));
    http.expectOne((r) => r.url === '/api/portfolio/summary' && r.params.has('period')).flush(summary);
    http.expectOne((r) => r.url === '/api/topics').flush([topic]);
    http.expectOne((r) => r.url === '/api/gaps').flush([]);
    http.expectOne((r) => r.url === '/api/papers/top').flush([]);
    await fixture.whenStable();

    const page = fixture.componentInstance as unknown as {
      tiles(): { id: string; value: unknown }[];
      priorities(): { id: string; health: string; change: number }[];
    };
    expect(page.tiles().find((t) => t.id === 'coverage')?.value).toBe('36%');
    expect(page.tiles().find((t) => t.id === 'reads')?.value).toBe('101K');
    expect(page.priorities()).toEqual([
      expect.objectContaining({ id: 't-neuro', health: 'at-risk', change: -0.03 }),
    ]);
  });
});
