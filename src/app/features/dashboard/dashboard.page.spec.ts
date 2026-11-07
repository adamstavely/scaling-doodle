import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/generated/api-configuration';
import type { OrgCenterDto } from '../../api/generated/models/org-center-dto';
import { centerRow, DashboardPage } from './dashboard.page';

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
  recentPapers: { lastMonth: 2, thisMonth: 1 },
};
const center = {
  id: 'sl-intel',
  name: 'Center for Intelligent Systems',
  code: 'CIS',
  lead: { id: 'mo', name: 'Marcus Okonkwo', initials: 'MO' },
  rollup: {
    health: 'healthy',
    trend: [70, 72, 75],
    momentum: 5,
    coverage: 0.5,
    openGaps: 4,
    work: 6,
    recentPapers: { lastMonth: 3, thisMonth: 0 },
  },
  teams: [],
} as unknown as OrgCenterDto;

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration('/api')],
    });
  });

  it('maps the API onto the priorities', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await Promise.resolve();
    const http = TestBed.inject(HttpTestingController);
    http.match((r) => r.url === '/api/me').forEach((r) => r.flush({ id: 'hv', name: 'Helena Vance' }));
    http.expectOne((r) => r.url === '/api/portfolio/summary' && r.params.has('period')).flush(summary);
    http.expectOne((r) => r.url === '/api/topics').flush([topic]);
    http.expectOne('/api/org').flush({ centers: [center], otherTeams: [] });
    await fixture.whenStable();

    const page = fixture.componentInstance as unknown as {
      priorities(): { id: string; health: string; change: number }[];
      centers(): { id: string }[];
    };
    expect(page.priorities()).toEqual([
      expect.objectContaining({ id: 't-neuro', health: 'at-risk', change: -0.03, figures: { lastMonth: 2, thisMonth: 1 } }),
    ]);
    expect(page.centers().map((c) => c.id)).toEqual(['sl-intel']);
  });

  it('turns a center into a priority row with its code as the badge', () => {
    expect(centerRow(center)).toEqual({
      id: 'sl-intel',
      name: 'Center for Intelligent Systems',
      badge: 'CIS',
      owner: 'Marcus Okonkwo',
      health: 'on-track',
      trend: [70, 72, 75],
      change: 0.05,
      coverage: 0.5,
      open: 4,
      work: 6,
      figures: { lastMonth: 3, thisMonth: 0 },
    });
  });
});
