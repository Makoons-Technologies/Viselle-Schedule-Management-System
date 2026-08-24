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
import { orgApi } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { formatCompactCurrency, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/common/LoadingState';
import type { RevenueGranularity, RevenuePoint } from '@/types/api';

const GRANULARITY_OPTIONS: { value: RevenueGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

function periodLabel(period: string, granularity: RevenueGranularity): string {
  const [year, month, day] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (granularity === 'month') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function RevenueTooltip({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenuePoint }>;
  granularity: RevenueGranularity;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md dark:border-stone-700 dark:bg-stone-900">
      <p className="font-medium text-stone-900 dark:text-stone-100">{periodLabel(point.period, granularity)}</p>
      <p className="text-brand-600 dark:text-brand-400">{formatCurrency(point.revenueCents)}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {point.salesCount} {point.salesCount === 1 ? 'sale' : 'sales'}
      </p>
    </div>
  );
}

export function RevenueChart({ orgId }: { orgId: string }) {
  const [granularity, setGranularity] = useState<RevenueGranularity>('day');
  const { resolvedColorMode } = useTheme();
  const isDark = resolvedColorMode === 'dark';
  const gridColor = isDark ? '#44403c' : '#e7e5e4';
  const tickColor = isDark ? '#a8a29e' : '#78716c';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'revenue', orgId, granularity],
    queryFn: () => orgApi.getRevenueReport(orgId, { granularity }),
    enabled: !!orgId,
  });

  const series = data?.series ?? [];
  const hasRevenue = series.some((point) => point.revenueCents > 0);

  return (
    <Card className="@container min-w-0">
      <CardHeader className="flex flex-col gap-4 @min-[32rem]:flex-row @min-[32rem]:items-start @min-[32rem]:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">Revenue Over Time</CardTitle>
          <CardDescription>
            Paid sales revenue (approximate profit; excludes any product or supply costs)
            {data && (
              <span className="ml-1 font-medium text-stone-700 dark:text-stone-200">
                · {formatCurrency(data.totalRevenueCents)} total
              </span>
            )}
          </CardDescription>
        </div>
        <Tabs className="shrink-0" value={granularity} onValueChange={(value) => setGranularity(value as RevenueGranularity)}>
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
          <LoadingState message="Loading revenue..." />
        ) : isError ? (
          <div className="flex h-64 items-center justify-center text-sm text-stone-500 dark:text-stone-400">
            Couldn't load revenue data. Try again later.
          </div>
        ) : !hasRevenue ? (
          <div className="flex h-64 items-center justify-center text-sm text-stone-500 dark:text-stone-400">
            No paid sales yet for this period.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
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
                <Tooltip content={<RevenueTooltip granularity={granularity} />} />
                <Area
                  type="monotone"
                  dataKey="revenueCents"
                  stroke="var(--color-brand-600)"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
