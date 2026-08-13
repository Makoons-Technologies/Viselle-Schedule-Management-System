import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { appRoutes } from '@/routes/AppRoutes';
import { getSubdomainBookingSlug } from '@/lib/subdomain-booking';
import { VISELLE_PRIVACY_URL, VISELLE_TERMS_URL } from '@/lib/legal';
import { PublicBookingPage } from '@/pages/public/PublicBookingPage';
import { ManageBookingPage } from '@/pages/public/ManageBookingPage';

function RedirectToLiveLegal({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return null;
}

function subdomainRoutes(slug: string) {
  return [
    { path: '/privacy', element: <RedirectToLiveLegal href={VISELLE_PRIVACY_URL} /> },
    { path: '/terms', element: <RedirectToLiveLegal href={VISELLE_TERMS_URL} /> },
    { path: '/terms-and-conditions', element: <RedirectToLiveLegal href={VISELLE_TERMS_URL} /> },
    { path: '/manage/:token', element: <ManageBookingPage slugOverride={slug} /> },
    { path: '/*', element: <PublicBookingPage slugOverride={slug} /> },
  ];
}

export default function App() {
  const subdomainSlug = getSubdomainBookingSlug();
  const routes = subdomainSlug ? subdomainRoutes(subdomainSlug) : appRoutes;
  return useRoutes(routes);
}
