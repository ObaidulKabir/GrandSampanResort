import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // The admin panel stays English and lives outside the [locale] segment, so
  // it must never be rewritten. API routes, uploads, Next internals and any
  // request with a file extension are passed through untouched.
  matcher: ['/((?!admin|api|_next|uploads|.*\\..*).*)']
};
