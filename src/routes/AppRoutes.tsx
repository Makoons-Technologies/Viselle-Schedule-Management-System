import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingState } from '@/components/common/LoadingState';
import { LoginPage } from '@/pages/LoginPage';
import { PlatformDashboard } from '@/pages/platform/PlatformDashboard';
import { OrganizationsPage } from '@/pages/platform/OrganizationsPage';
import { CreateOrganizationPage } from '@/pages/platform/CreateOrganizationPage';
import { OrgLayout } from '@/pages/org/OrgLayout';
import { OrgDashboard } from '@/pages/org/OrgDashboard';
import { CalendarPage } from '@/pages/org/CalendarPage';
import { AppointmentsPage } from '@/pages/org/AppointmentsPage';
import { StaffPage } from '@/pages/org/StaffPage';
import { ServicesPage } from '@/pages/org/ServicesPage';
import { AvailabilityPage } from '@/pages/org/AvailabilityPage';
import { CustomersPage } from '@/pages/org/CustomersPage';
import { RemindersPage } from '@/pages/org/RemindersPage';
import { RecurringPage } from '@/pages/org/RecurringPage';
import { SettingsLayout } from '@/pages/org/settings/SettingsLayout';
import { GeneralSettingsPage } from '@/pages/org/settings/GeneralSettingsPage';
import { OrgSettingsPage } from '@/pages/org/settings/OrgSettingsPage';
import { MySchedulePage } from '@/pages/staff/MySchedulePage';
import { StaffAppointmentsPage } from '@/pages/staff/StaffAppointmentsPage';
import { StaffAvailabilityPage } from '@/pages/staff/StaffAvailabilityPage';
import type { UserRole } from '@/types/api';

function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'platform_owner') return <Navigate to="/platform/dashboard" replace />;
    if (user.role === 'org_owner') return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
    return <Navigate to="/staff/schedule" replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'platform_owner') return <Navigate to="/platform/dashboard" replace />;
  if (user?.role === 'org_owner') return <Navigate to={`/orgs/${user.organizationId}/dashboard`} replace />;
  return <Navigate to="/staff/schedule" replace />;
}

export const appRoutes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <RootRedirect /> },
          {
            element: <ProtectedRoute roles={['platform_owner']} />,
            children: [
              { path: '/platform/dashboard', element: <PlatformDashboard /> },
              { path: '/platform/organizations', element: <OrganizationsPage /> },
              { path: '/platform/organizations/new', element: <CreateOrganizationPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['platform_owner', 'org_owner']} />,
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
                    element: <ProtectedRoute roles={['org_owner']} />,
                    children: [
                      { path: 'staff', element: <StaffPage /> },
                      { path: 'services', element: <ServicesPage /> },
                    ],
                  },
                  { path: 'availability', element: <AvailabilityPage /> },
                  { path: 'reminders', element: <RemindersPage /> },
                  { path: 'recurring', element: <RecurringPage /> },
                  { path: 'billing', element: <Navigate to="settings/general" replace /> },
                  { path: 'website', element: <Navigate to="settings/org" replace /> },
                  { path: 'owner-settings', element: <Navigate to="settings/org" replace /> },
                  {
                    path: 'settings',
                    element: <SettingsLayout />,
                    children: [
                      { index: true, element: <Navigate to="general" replace /> },
                      { path: 'general', element: <GeneralSettingsPage /> },
                      { path: 'org', element: <OrgSettingsPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute roles={['staff']} />,
            children: [
              { path: '/staff/schedule', element: <MySchedulePage /> },
              { path: '/staff/appointments', element: <StaffAppointmentsPage /> },
              { path: '/staff/availability', element: <StaffAvailabilityPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
