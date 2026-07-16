import { useRoutes } from 'react-router-dom';
import { appRoutes } from '@/routes/AppRoutes';
import { getSubdomainBookingSlug } from '@/lib/subdomain-booking';
import { PublicBookingPage } from '@/pages/public/PublicBookingPage';
import { ManageBookingPage } from '@/pages/public/ManageBookingPage';

function subdomainRoutes(slug: string) {
  return [
    { path: '/manage/:token', element: <ManageBookingPage slugOverride={slug} /> },
    { path: '/*', element: <PublicBookingPage slugOverride={slug} /> },
  ];
}

export default function App() {
  const subdomainSlug = getSubdomainBookingSlug();
  const routes = subdomainSlug ? subdomainRoutes(subdomainSlug) : appRoutes;
  return useRoutes(routes);
}
