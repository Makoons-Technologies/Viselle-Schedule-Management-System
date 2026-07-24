import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/common/LoadingState';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { GetStartedPage } from '@/pages/GetStartedPage';
import { GetStartedSuccessPage } from '@/pages/GetStartedSuccessPage';
import { PublicBookingPage } from '@/pages/public/PublicBookingPage';
import { ManageBookingPage } from '@/pages/public/ManageBookingPage';
import { PlatformDashboard } from '@/pages/platform/PlatformDashboard';
import { OrganizationsPage } from '@/pages/platform/OrganizationsPage';
import { CreateOrganizationPage } from '@/pages/platform/CreateOrganizationPage';
import { TrialsCampaignsPage } from '@/pages/platform/TrialsCampaignsPage';
import { PlatformOrgLayout } from '@/pages/platform/PlatformOrgLayout';
import { PlatformOrgOverviewPage } from '@/pages/platform/PlatformOrgOverviewPage';
import { PlatformOrgSettingsPage } from '@/pages/platform/PlatformOrgSettingsPage';
import { OrgLayout } from '@/pages/org/OrgLayout';
import { OrgDashboard } from '@/pages/org/OrgDashboard';
import { CalendarPage } from '@/pages/org/CalendarPage';
import { AppointmentsPage } from '@/pages/org/AppointmentsPage';
import { StaffPage } from '@/pages/org/StaffPage';
import { ServicesPage } from '@/pages/org/ServicesPage';
import { ProductsPage } from '@/pages/org/ProductsPage';
import { AvailabilityPage } from '@/pages/org/AvailabilityPage';
import { CustomersPage } from '@/pages/org/CustomersPage';
import { BookingWebsitePage } from '@/pages/org/BookingWebsitePage';
import { SettingsHubPage } from '@/pages/org/settings/SettingsHubPage';
import { SettingsDetailLayout } from '@/pages/org/settings/SettingsDetailLayout';
import { GeneralSettingsPage } from '@/pages/org/settings/GeneralSettingsPage';
import { OrgSettingsPage } from '@/pages/org/settings/OrgSettingsPage';
import { PaymentsSettingsPage } from '@/pages/org/settings/PaymentsSettingsPage';
import { StaffPermissionsSettingsPage } from '@/pages/org/settings/StaffPermissionsSettingsPage';
import { RecurringPage } from '@/pages/org/RecurringPage';
import { StaffAdminPermissionsPage } from '@/pages/staff/StaffAdminPermissionsPage';
import { StaffAvailabilityPage } from '@/pages/staff/StaffAvailabilityPage';
import type { UserRole } from '@/types/api';

function StaffOrgRedirect({ to }: { to: 'calendar' | 'appointments' }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  if (!orgId) return <Navigate to="/login" replace />;
  return <Navigate to={`/orgs/${orgId}/${to}`} replace />;
}

function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'platform_owner') return <Navigate to="/platform/dashboard" replace />;
    if (user.role === 'org_owner') return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
    if (user.organizationId) return <Navigate to={`/orgs/${user.organizationId}/calendar`} replace />;
    return <Navigate to="/staff/schedule" replace />;
  }
  return <Outlet />;
}

export const appRoutes = [
  { path: '/', element: <LandingPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/get-started', element: <GetStartedPage /> },
  { path: '/get-started/success', element: <GetStartedSuccessPage /> },
  { path: '/website', element: <Navigate to="/#websites" replace /> },
  { path: '/book/:slug', element: <PublicBookingPage /> },
  { path: '/book/:slug/manage/:token', element: <ManageBookingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <ProtectedRoute roles={['platform_owner']} />,
            children: [
              { path: '/platform/dashboard', element: <PlatformDashboard /> },
              { path: '/platform/organizations', element: <OrganizationsPage /> },
              { path: '/platform/organizations/new', element: <CreateOrganizationPage /> },
              { path: '/platform/trials', element: <TrialsCampaignsPage /> },
              {
                path: '/platform/orgs/:orgId',
                element: <PlatformOrgLayout />,
                children: [
                  { index: true, element: <PlatformOrgOverviewPage /> },
                  { path: 'settings', element: <PlatformOrgSettingsPage /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute roles={['platform_owner', 'org_owner', 'staff']} />,
            children: [
              {
                path: '/orgs/:orgId',
                element: <OrgLayout />,
                children: [
                  { path: 'dashboard', element: <OrgDashboard /> },
                  { path: 'calendar', element: <CalendarPage /> },
                  { path: 'appointments', element: <AppointmentsPage /> },
                  { path: 'customers', element: <CustomersPage /> },
                  {
                    element: <ProtectedRoute roles={['platform_owner', 'org_owner']} />,
                    children: [
                      { path: 'website', element: <BookingWebsitePage /> },
                      { path: 'staff', element: <StaffPage /> },
                      { path: 'availability', element: <AvailabilityPage /> },
                      { path: 'services', element: <Navigate to="settings/services" replace /> },
                      { path: 'reminders', element: <Navigate to="dashboard" replace /> },
                      { path: 'recurring', element: <RecurringPage /> },
                      { path: 'billing', element: <Navigate to="settings/general" replace /> },
                      { path: 'owner-settings', element: <Navigate to="settings/org" replace /> },
                      {
                        path: 'settings',
                        children: [
                          { index: true, element: <SettingsHubPage /> },
                          {
                            element: <SettingsDetailLayout />,
                            children: [
                              { path: 'general', element: <GeneralSettingsPage /> },
                              { path: 'org', element: <OrgSettingsPage /> },
                              { path: 'services', element: <ServicesPage /> },
                              { path: 'products', element: <ProductsPage /> },
                              { path: 'payments', element: <PaymentsSettingsPage /> },
                              { path: 'staff-permissions', element: <StaffPermissionsSettingsPage /> },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute roles={['staff']} />,
            children: [
              { path: '/staff/schedule', element: <StaffOrgRedirect to="calendar" /> },
              { path: '/staff/appointments', element: <StaffOrgRedirect to="appointments" /> },
              { path: '/staff/availability', element: <StaffAvailabilityPage /> },
              { path: '/staff/settings/staff-permissions', element: <StaffAdminPermissionsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
