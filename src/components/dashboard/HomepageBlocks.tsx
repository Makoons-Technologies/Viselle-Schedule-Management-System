import { Calendar, Scissors, UserCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Appointment, HomepageBlock, Service } from '@/types/api';
import { DashboardBookingLink } from '@/components/dashboard/DashboardBookingLink';
import { DashboardTrialStatus } from '@/components/dashboard/DashboardTrialStatus';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OrgSetupChecklist } from '@/components/onboarding/OrgSetupChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageBlock[] = [
  { id: 'welcome', type: 'welcome', visible: true, title: 'Welcome back', body: 'Here is how the salon looks today.' },
  { id: 'announcement', type: 'announcement', visible: false, title: '', body: '' },
  { id: 'stats', type: 'stats', visible: true },
  { id: 'setup', type: 'setup', visible: true },
  { id: 'bookingCta', type: 'bookingCta', visible: true, title: 'Booking link', body: 'Share this with clients so they can book online.' },
  { id: 'featuredServices', type: 'featuredServices', visible: false, serviceIds: [] },
  { id: 'upcoming', type: 'upcoming', visible: true },
  { id: 'revenue', type: 'revenue', visible: true },
];

export function HomepageBlocks({
  orgId,
  blocks,
  showSetup,
  canEdit,
  stats,
  services,
  upcomingAppointments,
}: {
  orgId: string;
  blocks: HomepageBlock[];
  showSetup: boolean;
  canEdit: boolean;
  stats: { upcoming: number; staff: number; services: number; customers: number };
  services: Service[];
  upcomingAppointments: Appointment[];
}) {
  const visible = blocks.filter((block) => block.visible);

  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex justify-end">
          <Link
            to={`/orgs/${orgId}/settings/homepage`}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            Edit homepage
          </Link>
        </div>
      ) : null}

      {visible.map((block) => {
        if (block.type === 'welcome') {
          return (
            <div key={block.id}>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{block.title || 'Welcome back'}</h2>
              {block.body ? <p className="mt-1 text-stone-600 dark:text-stone-400">{block.body}</p> : null}
            </div>
          );
        }
        if (block.type === 'announcement' && (block.title || block.body)) {
          return (
            <Card key={block.id} className="border-brand-200 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40">
              <CardHeader>
                <CardTitle className="text-base">{block.title || 'Announcement'}</CardTitle>
              </CardHeader>
              {block.body ? <CardContent className="text-sm text-stone-700 dark:text-stone-300">{block.body}</CardContent> : null}
            </Card>
          );
        }
        if (block.type === 'stats') {
          const items = [
            { label: 'Upcoming Appointments', value: stats.upcoming, icon: Calendar },
            { label: 'Staff Members', value: stats.staff, icon: Users },
            { label: 'Services', value: stats.services, icon: Scissors },
            { label: 'Customers', value: stats.customers, icon: UserCircle },
          ];
          return (
            <div key={block.id} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <Card key={item.label}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">{item.label}</CardTitle>
                    <item.icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }
        if (block.type === 'setup' && showSetup) {
          return <OrgSetupChecklist key={block.id} orgId={orgId} />;
        }
        if (block.type === 'bookingCta') {
          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle className="text-base">{block.title || 'Booking link'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {block.body ? <p className="text-sm text-stone-600 dark:text-stone-400">{block.body}</p> : null}
                <DashboardBookingLink orgId={orgId} />
              </CardContent>
            </Card>
          );
        }
        if (block.type === 'featuredServices') {
          const featured = services.filter((service) => (block.serviceIds ?? []).includes(service.id));
          if (featured.length === 0) return null;
          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle className="text-base">{block.title || 'Featured services'}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {featured.map((service) => (
                  <div key={service.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-stone-500">
                      {service.durationMinutes} min
                      {service.priceCents != null ? ` · ${formatCurrency(service.priceCents)}` : ''}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        }
        if (block.type === 'upcoming') {
          const next = upcomingAppointments.slice(0, 5);
          return (
            <Card key={block.id}>
              <CardHeader>
                <CardTitle className="text-base">{block.title || 'Coming up'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {next.length === 0 ? (
                  <p className="text-stone-500">No upcoming appointments.</p>
                ) : (
                  next.map((appointment) => (
                    <div key={appointment.id} className="flex justify-between gap-3">
                      <span className="truncate text-stone-800 dark:text-stone-200">
                        {new Date(appointment.startTime).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        }
        if (block.type === 'revenue') {
          return (
            <div key={block.id}>
              <RevenueChart orgId={orgId} />
            </div>
          );
        }
        return null;
      })}
      {!visible.some((block) => block.type === 'setup') ? <DashboardTrialStatus /> : null}
    </div>
  );
}
