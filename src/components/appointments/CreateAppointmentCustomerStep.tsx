import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Customer } from '@/types/api';
import {
  customerDisplayName,
  filterCustomersForAutocomplete,
  getCustomerFieldChanges,
  sortCustomersByName,
} from '@/lib/customers';
import { cn } from '@/lib/utils';
import { CustomerFieldChangesList } from '@/components/customers/CustomerFieldChangesList';
import { helperTextClass } from '@/components/common/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmsOptInCheckbox } from '@/components/booking/SmsOptInCheckbox';

interface CreateAppointmentCustomerStepProps {
  customers: Customer[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  selectedCustomerId: string | null;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectNewCustomer: () => void;
  onRequestUndo: () => void;
  errors?: Partial<Record<'firstName' | 'lastName' | 'email', string>>;
  showSmsOptIn: boolean;
  smsBrandName: string;
  smsOptIn: boolean;
  onSmsOptInChange: (value: boolean) => void;
  smsHelperText: string;
}

export function CreateAppointmentCustomerStep({
  customers,
  firstName,
  lastName,
  email,
  phone,
  selectedCustomerId,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
  onSelectCustomer,
  onSelectNewCustomer,
  onRequestUndo,
  errors,
  showSmsOptIn,
  smsBrandName,
  smsOptIn,
  onSmsOptInChange,
  smsHelperText,
}: CreateAppointmentCustomerStepProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const liveChanges = selectedCustomer
    ? getCustomerFieldChanges(selectedCustomer, { firstName, lastName, email, phone })
    : [];

  const sortedCustomers = useMemo(() => sortCustomersByName(customers), [customers]);
  const visibleCustomers = useMemo(() => {
    if (!query.trim()) return sortedCustomers;
    return filterCustomersForAutocomplete(sortedCustomers, query, Number.POSITIVE_INFINITY);
  }, [query, sortedCustomers]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [pickerOpen]);

  const applyNewCustomer = () => {
    onSelectNewCustomer();
    setQuery('');
    setPickerOpen(false);
  };

  const applyCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setQuery('');
    setPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      <div ref={pickerRef} className="relative">
        <Label>Customer</Label>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          onClick={() => {
            setPickerOpen((open) => !open);
            setQuery('');
          }}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        >
          <span className="truncate">
            {selectedCustomer ? customerDisplayName(selectedCustomer) : 'New customer'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" />
        </button>
        {pickerOpen ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
            <div className="border-b border-stone-100 p-2 dark:border-stone-800">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customers"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1" role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={!selectedCustomer}
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800',
                  !selectedCustomer && 'bg-brand-50 dark:bg-brand-950',
                )}
                onClick={applyNewCustomer}
              >
                <span className="font-medium text-stone-900 dark:text-stone-100">New customer</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Enter details below
                </span>
              </button>
              {visibleCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  role="option"
                  aria-selected={selectedCustomerId === customer.id}
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800',
                    selectedCustomerId === customer.id && 'bg-brand-50 dark:bg-brand-950',
                  )}
                  onClick={() => applyCustomer(customer)}
                >
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {customerDisplayName(customer)}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact info'}
                  </span>
                </button>
              ))}
              {visibleCustomers.length === 0 ? (
                <p className="px-3 py-2 text-sm text-stone-500">No customers match that search.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {selectedCustomer && liveChanges.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/70 dark:bg-amber-950/40">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              These details are different from what we have on file for{' '}
              <span className="font-medium">{customerDisplayName(selectedCustomer)}</span>. Saving
              will update their record in the system.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRequestUndo}>
              Undo
            </Button>
          </div>
          <CustomerFieldChangesList changes={liveChanges} />
        </div>
      ) : selectedCustomer ? (
        <p className={helperTextClass}>
          Booking under {customerDisplayName(selectedCustomer)}. Edits here update their saved
          profile after you confirm.
        </p>
      ) : (
        <p className={helperTextClass}>Creating a new customer for this appointment.</p>
      )}

      <div>
        <Label>First name</Label>
        <Input
          value={firstName}
          autoComplete="off"
          onChange={(event) => onFirstNameChange(event.target.value)}
        />
        {errors?.firstName ? <p className="text-xs text-red-600 dark:text-red-400">Required</p> : null}
      </div>

      <div>
        <Label>Last name</Label>
        <Input
          value={lastName}
          autoComplete="off"
          onChange={(event) => onLastNameChange(event.target.value)}
        />
        {errors?.lastName ? <p className="text-xs text-red-600 dark:text-red-400">Required</p> : null}
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          value={phone}
          autoComplete="off"
          onChange={(event) => onPhoneChange(event.target.value)}
        />
        {showSmsOptIn ? (
          <div className="mt-3 rounded-lg border border-stone-200 px-3 py-3 dark:border-stone-700 dark:bg-stone-800/40">
            <SmsOptInCheckbox
              brandName={smsBrandName}
              checked={smsOptIn}
              onCheckedChange={onSmsOptInChange}
              id="staff-sms-opt-in"
              textClassName="text-stone-600 dark:text-stone-300"
            />
            <p className={cn(helperTextClass, 'mt-2')}>{smsHelperText}</p>
          </div>
        ) : null}
      </div>

      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          autoComplete="off"
          onChange={(event) => onEmailChange(event.target.value)}
        />
        {errors?.email ? (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>
        ) : null}
      </div>
    </div>
  );
}
