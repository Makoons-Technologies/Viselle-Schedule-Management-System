import axios from 'axios';
import { ApiError, getFallbackRequestErrorMessage } from '@/lib/api';
import type { DemoBooking, DemoSlot } from '@/types/api';

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
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
