import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { Landing } from './landing/landing';

export const routes: Routes = [
  {
    path: '',
    component: Landing,
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'auth-mfe', exposedModule: './Module' })
        .then(m => m.default)
  },
  {
    path: 'live',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'live-mfe', exposedModule: './Component' })
        .then(m => m.App)
  },
  {
    path: 'stats',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'stats-mfe', exposedModule: './Component' })
        .then(m => m.App)
  },
  {
    path: 'fantasy',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'fantasy-mfe', exposedModule: './Component' })
        .then(m => m.App)
  },
  {
    path: 'predictor',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'predictor-mfe', exposedModule: './Component' })
        .then(m => m.App)
  },
  {
    path: 'news',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'news-mfe', exposedModule: './Component' })
        .then(m => m.App)
  },
  {
    path: 'login-required',
    loadComponent: () =>
      loadRemoteModule({ type: 'manifest', remoteName: 'login-required-mfe', exposedModule: './Component' })
        .then(m => m.LoginRequiredComponent)
  }
];