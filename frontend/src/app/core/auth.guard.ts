import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowOrRedirect = (): boolean | ReturnType<Router['createUrlTree']> => {
    if (auth.isLoggedIn()) return true;
    auth.openModal('login');
    return router.createUrlTree(['/account']);
  };

  if (auth.ready()) return allowOrRedirect();

  return new Promise(resolve => {
    const started = Date.now();
    const t = setInterval(() => {
      if (auth.ready() || Date.now() - started > 2500) {
        clearInterval(t);
        resolve(allowOrRedirect());
      }
    }, 40);
  });
};
