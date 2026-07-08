import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('blocks private routes without session', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/app/dashboard' } as never),
    );
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fapp%2Fdashboard');
  });
});
