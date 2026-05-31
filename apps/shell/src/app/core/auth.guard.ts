import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '@f1-racelab/shared-ui';

export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isLoggedIn()) {
    return true;  // ✅ user logged in, allow access
  }

  // ❌ not logged in, redirect to login
  router.navigate(['/auth/login']);
  return false;
};