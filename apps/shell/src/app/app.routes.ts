import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';

export const routes: Routes = [

  {
    path: 'auth',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4201/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'live',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4202/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'stats',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4203/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'fantasy',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4204/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'predictor',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4205/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: 'news',
    loadComponent: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4206/remoteEntry.js',
        exposedModule: './Component'
      }).then(m => m.App)
  },
  {
    path: '',
    redirectTo: 'live',
    pathMatch: 'full'
  }
];