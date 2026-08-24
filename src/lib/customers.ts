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

export function sortCustomersByName(customers: Customer[]): Customer[] {
  return customers.slice().sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName);
    return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
  });
}

export function filterCustomersForAutocomplete(
  customers: Customer[],
  query: string,
  limit = 8,
): Customer[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const phoneDigits = normalizePhone(trimmed);

  const matches = customers.filter((customer) => {
    const name = customerDisplayName(customer).toLowerCase();
    const email = customer.email?.toLowerCase() ?? '';
    const phone = customer.phone ? normalizePhone(customer.phone) : '';

    if (name.includes(lower)) return true;
    if (email.includes(lower)) return true;
    if (phoneDigits.length >= 3 && phone.includes(phoneDigits)) return true;
    return false;
  });

  return Number.isFinite(limit) ? matches.slice(0, limit) : matches;
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

export type CustomerContactInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

export type CustomerFieldChange = {
  field: 'firstName' | 'lastName' | 'email' | 'phone';
  label: string;
  from: string;
  to: string;
};

export function formatCustomerFieldValue(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed || '—';
}

/** Field-level from → to diffs for customer contact fields. */
export function getCustomerFieldChanges(
  customer: Customer,
  input: CustomerContactInput,
): CustomerFieldChange[] {
  const changes: CustomerFieldChange[] = [];

  if (customer.firstName.trim() !== input.firstName.trim()) {
    changes.push({
      field: 'firstName',
      label: 'First name',
      from: formatCustomerFieldValue(customer.firstName),
      to: formatCustomerFieldValue(input.firstName),
    });
  }

  if (customer.lastName.trim() !== input.lastName.trim()) {
    changes.push({
      field: 'lastName',
      label: 'Last name',
      from: formatCustomerFieldValue(customer.lastName),
      to: formatCustomerFieldValue(input.lastName),
    });
  }

  const inputEmail = normalizeEmail(input.email ?? '');
  const existingEmail = customer.email ? normalizeEmail(customer.email) : '';
  if (inputEmail !== existingEmail) {
    changes.push({
      field: 'email',
      label: 'Email',
      from: formatCustomerFieldValue(customer.email),
      to: formatCustomerFieldValue(input.email),
    });
  }

  const inputPhone = normalizePhone(input.phone ?? '');
  const existingPhone = customer.phone ? normalizePhone(customer.phone) : '';
  if (inputPhone !== existingPhone) {
    changes.push({
      field: 'phone',
      label: 'Phone',
      from: formatCustomerFieldValue(customer.phone),
      to: formatCustomerFieldValue(input.phone),
    });
  }

  return changes;
}

/** True when form contact fields differ from the existing customer record. */
export function customerContactChanged(
  customer: Customer,
  input: CustomerContactInput,
): boolean {
  return getCustomerFieldChanges(customer, input).length > 0;
}
