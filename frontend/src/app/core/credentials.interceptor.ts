import { HttpInterceptorFn } from '@angular/common/http';

/** Always send cookies for same-origin API (session auth). */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api')) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
