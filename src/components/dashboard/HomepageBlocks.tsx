import { useMutation, useQuery } from '@tanstack/react-query';
import { Calendar, Scissors, UserCircle, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { calendarAppointmentHref } from '@/lib/calendar-appointment-href';
import { CollapsibleBox, ResponsiveTable, ResponsiveTabs } from '@/components/builder/ResponsiveLayout';
import { FormioRenderer, collectRequiredGaps } from '@/components/forms/FormioRenderer';
import { DashboardBookingLink } from '@/components/dashboard/DashboardBookingLink';
import { DashboardTrialStatus } from '@/components/dashboard/DashboardTrialStatus';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OrgSetupChecklist } from '@/components/onboarding/OrgSetupChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage, orgApi } from '@/lib/api';
import { liveFormSchema } from '@/lib/forms';
import { cn, formatCurrency } from '@/lib/utils';
import type { Appointment, HomepageBlock, HomepageColumn, Service } from '@/types/api';

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageBlock[] = [
  { id: 'welcome', type: 'welcome', visible: true, title: 'Welcome back', body: 'Here is how the salon looks today.' },
  { id: 'announcement', type: 'announcement', visible: false, title: '', body: '' },
  { id: 'stats', type: 'stats', visible: true },
  { id: 'setup', type: 'setup', visible: true },
  { id: 'bookingCta', type: 'bookingCta', visible: false, title: 'Booking link', body: 'Share this with clients so they can book online.' },
  { id: 'featuredServices', type: 'featuredServices', visible: false, serviceIds: [] },
  { id: 'upcoming', type: 'upcoming', visible: true },
  { id: 'revenue', type: 'revenue', visible: true },
];

/** Stat tiles can sit two-across on a phone. Everything else stays full width. */
function isCompactHomepageBlock(block: HomepageBlock): boolean {
  return block.type === 'stats';
}

function homepageColumnIsCompact(column: HomepageColumn): boolean {
  const kids = (column.components ?? []).filter((child) => child.visible !== false);
  return kids.length > 0 && kids.every(isCompactHomepageBlock);
}

type HomepageContext = {
  orgId: string;
  showSetup: boolean;
  stats: { upcoming: number; staff: number; services: number; customers: number };
  services: Service[];
  upcomingAppointments: Appointment[];
};

export function HomepageBlocks({
  orgId,
  blocks,
  showSetup,
  stats,
  services,
  upcomingAppointments,
}: {
  orgId: string;
  blocks: HomepageBlock[];
  showSetup: boolean;
  stats: { upcoming: number; staff: number; services: number; customers: number };
  services: Service[];
  upcomingAppointments: Appointment[];
}) {
  const ctx: HomepageContext = { orgId, showSetup, stats, services, upcomingAppointments };
  const visible = blocks.filter((block) => block.visible !== false);

  return (
    <div className="@container min-w-0 space-y-6">
      {visible.map((block) => (
        <BlockView key={block.id} block={block} ctx={ctx} />
      ))}
      {!visible.some((block) => block.type === 'setup') ? <DashboardTrialStatus /> : null}
    </div>
  );
}

function BlockView({ block, ctx }: { block: HomepageBlock; ctx: HomepageContext }) {
  if (block.visible === false) return null;

  if (block.type === 'columns') {
    const columns = block.columns?.length ? block.columns : [{ components: block.components ?? [] }];
    const count = Math.min(Math.max(columns.length, 1), 4);
    return (
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 gap-4',
          count >= 2 && '@min-[20rem]:grid-cols-2',
          count === 3 && '@min-[56rem]:grid-cols-3',
          count >= 4 && '@min-[56rem]:grid-cols-4',
        )}
      >
        {columns.map((column, index) => (
          <div
            key={index}
            className={cn(
              'min-w-0 space-y-4',
              !homepageColumnIsCompact(column) && 'col-span-full @min-[56rem]:col-span-1',
            )}
          >
            {(column.components ?? []).map((child) => (
              <BlockView key={child.id} block={child} ctx={ctx} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === 'tabs') {
    const tabs = block.tabs?.length
      ? block.tabs
      : (block.components ?? []).map((tab) => ({ label: tab.title || tab.label || 'Tab', key: tab.id, components: tab.components ?? [] }));
    return (
      <ResponsiveTabs tabs={tabs}>
        {(open) =>
          (tabs[open]?.components ?? []).map((child) => <BlockView key={child.id} block={child} ctx={ctx} />)
        }
      </ResponsiveTabs>
    );
  }

  if (block.type === 'table') {
    const rows = block.rows ?? [];
    return (
      <ResponsiveTable
        rows={rows}
        renderCell={(rowIndex, cellIndex) =>
          (rows[rowIndex]?.[cellIndex]?.components ?? []).map((child) => (
            <BlockView key={child.id} block={child} ctx={ctx} />
          ))
        }
      />
    );
  }

  if (block.type === 'panel' || block.type === 'fieldset' || block.type === 'well' || block.type === 'container') {
    return (
      <CollapsibleBox title={block.title || block.label} collapsible={block.type === 'panel'}>
        <div className="grid grid-cols-1 gap-4">
          {(block.components ?? []).map((child) => (
            <BlockView key={child.id} block={child} ctx={ctx} />
          ))}
        </div>
      </CollapsibleBox>
    );
  }

  if (block.type === 'form') {
    return (
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">{block.title || 'Form'}</CardTitle>
        </CardHeader>
        <CardContent>
          <HomepageForm orgId={ctx.orgId} formId={block.formId} />
        </CardContent>
      </Card>
    );
  }

  return <Widget block={block} ctx={ctx} />;
}

function Widget({ block, ctx }: { block: HomepageBlock; ctx: HomepageContext }) {
  if (block.type === 'welcome') {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{block.title || 'Welcome back'}</h2>
        {block.body ? <p className="mt-1 text-stone-600 dark:text-stone-400">{block.body}</p> : null}
      </div>
    );
  }
  if (block.type === 'announcement' && (block.title || block.body)) {
    return (
      <Card className="border-brand-200 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40">
        <CardHeader>
          <CardTitle className="text-base">{block.title || 'Announcement'}</CardTitle>
        </CardHeader>
        {block.body ? <CardContent className="text-sm text-stone-700 dark:text-stone-300">{block.body}</CardContent> : null}
      </Card>
    );
  }
  if (block.type === 'stats') {
    const items = [
      { label: 'Upcoming Appointments', value: ctx.stats.upcoming, icon: Calendar },
      { label: 'Staff Members', value: ctx.stats.staff, icon: Users },
      { label: 'Services', value: ctx.stats.services, icon: Scissors },
      { label: 'Customers', value: ctx.stats.customers, icon: UserCircle },
    ];
    return (
      <div className="grid grid-cols-2 gap-4 @min-[56rem]:grid-cols-4">
        {items.map((item) => (
          <Card key={item.label} className="min-w-0">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium leading-snug text-stone-500 dark:text-stone-400">{item.label}</CardTitle>
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
  if (block.type === 'setup' && ctx.showSetup) {
    return <OrgSetupChecklist orgId={ctx.orgId} />;
  }
  if (block.type === 'bookingCta') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{block.title || 'Booking link'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {block.body ? <p className="text-sm text-stone-600 dark:text-stone-400">{block.body}</p> : null}
          <DashboardBookingLink orgId={ctx.orgId} />
        </CardContent>
      </Card>
    );
  }
  if (block.type === 'featuredServices') {
    const featured = ctx.services.filter((service) => (block.serviceIds ?? []).includes(service.id));
    if (featured.length === 0) return null;
    return (
      <Card>
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
    const next = ctx.upcomingAppointments.slice(0, 5);
    return (
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base">{block.title || 'Coming up'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {next.length === 0 ? (
            <p className="text-stone-500">No upcoming appointments.</p>
          ) : (
            next.map((appointment) => (
              <Link
                key={`${appointment.id}-${appointment.startTime}`}
                to={calendarAppointmentHref(ctx.orgId, appointment)}
                className="block truncate text-stone-800 underline-offset-2 hover:text-brand-700 hover:underline dark:text-stone-200 dark:hover:text-brand-300"
              >
                {new Date(appointment.startTime).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    );
  }
  if (block.type === 'revenue') {
    return <RevenueChart orgId={ctx.orgId} />;
  }
  if (block.content || block.body) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm whitespace-pre-wrap dark:border-stone-800 dark:bg-stone-950/40">
        {block.title ? <p className="mb-1 font-medium">{block.title}</p> : null}
        {block.body || block.content}
      </div>
    );
  }
  return null;
}

function HomepageForm({ orgId, formId }: { orgId: string; formId?: string }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const query = useQuery({
    queryKey: ['form', orgId, formId],
    queryFn: () => orgApi.getForm(orgId, formId!),
    enabled: Boolean(orgId && formId),
  });
  const submit = useMutation({
    mutationFn: () => orgApi.submitForm(orgId, formId!, { data: values }),
    onSuccess: () => {
      toast.success('Saved');
      setValues({});
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not save this form')),
  });

  if (!formId) return <p className="text-sm text-stone-500">Choose a published form to show here.</p>;
  if (query.isLoading) return <p className="text-sm text-stone-500">Loading form…</p>;
  const form = query.data?.form;
  if (!form) return <p className="text-sm text-stone-500">Form not found.</p>;
  if (form.status !== 'published') {
    return <p className="text-sm text-stone-500">Publish this form before collecting answers on the dashboard.</p>;
  }

  const schema = liveFormSchema(form);
  const missing = collectRequiredGaps(schema, values);
  return (
    <div className="min-w-0 space-y-4">
      <FormioRenderer schema={schema} value={values} onChange={setValues} orgId={orgId} />
      <Button
        className="h-11 w-full sm:w-auto"
        disabled={submit.isPending}
        onClick={() => {
          if (missing.length) {
            toast.error(`Fill in: ${missing.join(', ')}`);
            return;
          }
          submit.mutate();
        }}
      >
        {submit.isPending ? 'Saving…' : 'Save answers'}
      </Button>
    </div>
  );
}
