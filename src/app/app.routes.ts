import { Routes } from '@angular/router';
import { whenOn } from './core/features';

export const routes: Routes = [
  {
    path: '',
    title: 'Metrics Summary · INTELLECT',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'topics',
    title: 'Research Topics · INTELLECT',
    loadComponent: () => import('./features/topics/topics.page').then((m) => m.TopicsPage),
  },
  {
    path: 'topics/:id',
    title: 'Topic · INTELLECT',
    loadComponent: () => import('./features/topic/topic.page').then((m) => m.TopicPage),
  },
  {
    path: 'gaps',
    canMatch: [whenOn('gaps')],
    title: 'Gaps & Coverage · INTELLECT',
    loadComponent: () => import('./features/gaps/gaps.page').then((m) => m.GapsPage),
  },
  {
    path: 'resourcing',
    canMatch: [whenOn('resourcing')],
    title: 'Resourcing · INTELLECT',
    loadComponent: () => import('./features/resourcing/resourcing.page').then((m) => m.ResourcingPage),
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
    path: 'partners',
    title: 'Partner Labs · INTELLECT',
    loadComponent: () => import('./features/partners/partners.page').then((m) => m.PartnersPage),
  },
  {
    path: 'partners/:lab',
    title: 'Partner Lab · INTELLECT',
    loadComponent: () => import('./features/partner-lab/partner-lab.page').then((m) => m.PartnerLabPage),
  },
  {
    path: 'centers/:id',
    title: 'Mission Center · INTELLECT',
    loadComponent: () => import('./features/center/center.page').then((m) => m.CenterPage),
  },
  {
    path: 'org',
    title: 'Centers & Teams · INTELLECT',
    loadComponent: () => import('./features/org/org.page').then((m) => m.OrgPage),
  },
  {
    path: 'people',
    canMatch: [whenOn('people')],
    title: 'People · INTELLECT',
    loadComponent: () => import('./features/people/people.page').then((m) => m.PeoplePage),
  },
  { path: '**', redirectTo: '' },
];
