import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware replacements for `next/link` and `next/navigation`.
 * Buyer-facing code must import from here so hrefs keep the /bn prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
