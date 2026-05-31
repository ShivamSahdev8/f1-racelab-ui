import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'auth-mfe',
        exposedModule: './Module'
      }).then(m => m.default)
  },
  {
    path: 'live',
    loadComponent: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'live-mfe',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'stats',
    loadComponent: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'stats-mfe',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'fantasy',
    canActivate: [authGuard],
    loadComponent: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'fantasy-mfe',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'predictor',
    canActivate: [authGuard],
    loadComponent: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'predictor-mfe',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'news',
    loadComponent: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'news-mfe',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: '',
    redirectTo: 'live',
    pathMatch: 'full'
  }
];