import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Portfolio Health · INTELLECT',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'topics/:id',
    title: 'Topic · INTELLECT',
    loadComponent: () => import('./features/topic/topic.page').then((m) => m.TopicPage),
  },
  {
    path: 'papers',
    title: 'Papers & Impact · INTELLECT',
    loadComponent: () => import('./features/papers/papers.page').then((m) => m.PapersPage),
  },
  {
    path: 'papers/:id',
    title: 'Paper · INTELLECT',
    loadComponent: () => import('./features/papers/papers.page').then((m) => m.PapersPage),
  },
  {
    path: 'org',
    title: 'Centers & Teams · INTELLECT',
    loadComponent: () => import('./features/org/org.page').then((m) => m.OrgPage),
  },
  {
    path: 'people',
    title: 'People · INTELLECT',
    loadComponent: () => import('./features/people/people.page').then((m) => m.PeoplePage),
  },
  { path: '**', redirectTo: '' },
];
