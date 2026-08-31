import axios from 'axios';
import { ApiError, getFallbackRequestErrorMessage } from '@/lib/api';
import type { DemoBooking, DemoSlot } from '@/types/api';

/** Matches backend DEMO_HORIZON_DAYS — all bookable demo slots live within this window. */
export const DEMO_BOOKING_HORIZON_DAYS = 14;

const demoClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: { 'Content-Type': 'application/json' },
});

demoClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (data?.error) {
      throw new ApiError(
        data.error.code,
        data.error.message,
        error.response?.status ?? 500,
        data.error.details,
      );
    }
    throw new ApiError(
      error.response?.status && error.response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
      getFallbackRequestErrorMessage(error),
      error.response?.status ?? 0,
    );
  },
);

export function requestDemoPath() {
  return '/request-demo';
}

export function formatDemoDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDemoTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDemoDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function demoDayKey(iso: string) {
  return localDayKey(new Date(iso));
}

export function startOfLocalDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeekMonday(date: Date) {
  const next = startOfLocalDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function demoBookingRange(horizonDays = DEMO_BOOKING_HORIZON_DAYS) {
  const from = startOfLocalDay();
  const to = addDays(from, horizonDays);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function demoBookingsInWeek(bookings: DemoBooking[], weekStart: Date) {
  const fromMs = weekStart.getTime();
  const toMs = addDays(weekStart, 7).getTime();
  return bookings.filter((booking) => {
    const startsMs = new Date(booking.startsAt).getTime();
    return startsMs >= fromMs && startsMs < toMs;
  });
}

export function upcomingScheduledDemos(bookings: DemoBooking[], now = Date.now()) {
  return bookings
    .filter((booking) => booking.status === 'scheduled' && new Date(booking.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function fetchDemoSlots() {
  const { data } = await demoClient.get<{
    slots: DemoSlot[];
    timeZone: string;
    slotMinutes: number;
  }>('/demo/slots');
  return data;
}

export async function bookDemo(input: {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  notes?: string;
  startsAt: string;
}) {
  const { data } = await demoClient.post<{ booking: DemoBooking }>('/demo/book', input);
  return data.booking;
}
