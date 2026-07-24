import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ownerApi } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/common/LoadingState';
import type { MrrGranularity, MrrPoint } from '@/types/api';

const GRANULARITY_OPTIONS: { value: MrrGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

function periodLabel(period: string, granularity: MrrGranularity): string {
  const [year, month, day] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (granularity === 'month') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function MrrTooltip({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: MrrPoint }>;
  granularity: MrrGranularity;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md dark:border-stone-700 dark:bg-stone-900">
      <p className="font-medium text-stone-900 dark:text-stone-100">{periodLabel(point.period, granularity)}</p>
      <p className="text-brand-600 dark:text-brand-400">{formatCurrency(point.mrrCents)} MRR</p>
      {point.newOrganizationsCount > 0 && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          +{formatCurrency(point.newMrrCents)} from {point.newOrganizationsCount}{' '}
          {point.newOrganizationsCount === 1 ? 'new org' : 'new orgs'}
        </p>
      )}
    </div>
  );
}

export function MrrChart() {
  const [granularity, setGranularity] = useState<MrrGranularity>('week');
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const gridColor = isDark ? '#44403c' : '#e7e5e4';
  const tickColor = isDark ? '#a8a29e' : '#78716c';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['owner', 'reports', 'mrr', granularity],
    queryFn: () => ownerApi.getMrrReport({ granularity }),
  });

  const series = data?.series ?? [];
  const hasData = series.some((point) => point.mrrCents > 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Estimated MRR Over Time</CardTitle>
          <CardDescription>
            Subscription revenue approximation, based on current plan pricing and org signup dates
            {data && (
              <span className="ml-1 font-medium text-stone-700 dark:text-stone-200">
                · {formatCurrency(data.currentMrrCents)} today
              </span>
            )}
          </CardDescription>
        </div>
        <Tabs value={granularity} onValueChange={(value) => setGranularity(value as MrrGranularity)}>
          <TabsList>
            {GRANULARITY_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState message="Loading MRR..." />
        ) : isError ? (
          <div className="flex h-64 items-center justify-center text-sm text-stone-500 dark:text-stone-400">
            Couldn't load MRR data. Try again later.
          </div>
        ) : !hasData ? (
          <div className="flex h-64 items-center justify-center text-sm text-stone-500 dark:text-stone-400">
            No billable organizations yet for this period.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value: string) => periodLabel(value, granularity)}
                  tick={{ fontSize: 12, fill: tickColor }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                  tick={{ fontSize: 12, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<MrrTooltip granularity={granularity} />} />
                <Area
                  type="monotone"
                  dataKey="mrrCents"
                  stroke="var(--color-brand-600)"
                  strokeWidth={2}
                  fill="url(#mrrFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
