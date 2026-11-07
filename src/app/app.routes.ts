import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Portfolio Health · Intellect',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'topics/:id',
    title: 'Topic · Intellect',
    loadComponent: () => import('./features/topic/topic.page').then((m) => m.TopicPage),
  },
  {
    path: 'papers',
    title: 'Papers & Impact · Intellect',
    loadComponent: () => import('./features/papers/papers.page').then((m) => m.PapersPage),
  },
  {
    path: 'papers/:id',
    title: 'Paper · Intellect',
    loadComponent: () => import('./features/papers/papers.page').then((m) => m.PapersPage),
  },
  {
    path: 'org',
    title: 'Centers & Teams · Intellect',
    loadComponent: () => import('./features/org/org.page').then((m) => m.OrgPage),
  },
  {
    path: 'people',
    title: 'People · Intellect',
    loadComponent: () => import('./features/people/people.page').then((m) => m.PeoplePage),
  },
  { path: '**', redirectTo: '' },
];
