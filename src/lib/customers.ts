import type { Customer } from '@/types/api';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function customerDisplayName(customer: Pick<Customer, 'firstName' | 'lastName'>): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function filterCustomersForAutocomplete(
  customers: Customer[],
  query: string,
): Customer[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const phoneDigits = normalizePhone(trimmed);

  return customers
    .filter((customer) => {
      const name = customerDisplayName(customer).toLowerCase();
      const email = customer.email?.toLowerCase() ?? '';
      const phone = customer.phone ? normalizePhone(customer.phone) : '';

      if (name.includes(lower)) return true;
      if (email.includes(lower)) return true;
      if (phoneDigits.length >= 3 && phone.includes(phoneDigits)) return true;
      return false;
    })
    .slice(0, 8);
}

export function findCustomerByEmail(customers: Customer[], email: string): Customer | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return customers.find((customer) => customer.email && normalizeEmail(customer.email) === normalized);
}

export function findCustomerByPhone(customers: Customer[], phone: string): Customer | undefined {
  const normalized = normalizePhone(phone);
  if (normalized.length < 7) return undefined;
  return customers.find(
    (customer) => customer.phone && normalizePhone(customer.phone) === normalized,
  );
}

export function findExistingCustomerMatch(
  customers: Customer[],
  input: { email?: string; phone?: string },
): { customer: Customer; matchedBy: 'email' | 'phone' } | null {
  if (input.email) {
    const byEmail = findCustomerByEmail(customers, input.email);
    if (byEmail) return { customer: byEmail, matchedBy: 'email' };
  }

  if (input.phone) {
    const byPhone = findCustomerByPhone(customers, input.phone);
    if (byPhone) return { customer: byPhone, matchedBy: 'phone' };
  }

  return null;
}
