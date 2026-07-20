import { useMemo, useRef, useState } from 'react';
import type { Customer } from '@/types/api';
import {
  customerDisplayName,
  filterCustomersForAutocomplete,
} from '@/lib/customers';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CustomerField = 'firstName' | 'lastName' | 'email' | 'phone';

interface CustomerAutocompleteFieldsProps {
  customers: Customer[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onClearSelectedCustomer: () => void;
  selectedCustomerId: string | null;
  errors?: Partial<Record<CustomerField, string>>;
}

export function CustomerAutocompleteFields({
  customers,
  firstName,
  lastName,
  email,
  phone,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
  onSelectCustomer,
  onClearSelectedCustomer,
  selectedCustomerId,
  errors,
}: CustomerAutocompleteFieldsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeField, setActiveField] = useState<CustomerField | null>(null);
  const [open, setOpen] = useState(false);

  const fieldValues: Record<CustomerField, string> = {
    firstName,
    lastName,
    email,
    phone,
  };

  const activeQuery = activeField ? fieldValues[activeField] : '';

  const suggestions = useMemo(
    () => filterCustomersForAutocomplete(customers, activeQuery),
    [customers, activeQuery],
  );

  const showSuggestions = open && activeField !== null && activeQuery.trim().length > 0 && suggestions.length > 0;

  const handleFieldChange = (field: CustomerField, value: string) => {
    onClearSelectedCustomer();
    switch (field) {
      case 'firstName':
        onFirstNameChange(value);
        break;
      case 'lastName':
        onLastNameChange(value);
        break;
      case 'email':
        onEmailChange(value);
        break;
      case 'phone':
        onPhoneChange(value);
        break;
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setOpen(false);
    setActiveField(null);
  };

  return (
    <div ref={containerRef} className="relative space-y-4">
      {selectedCustomerId && (
        <p className="text-xs text-brand-700">Existing customer selected from your list.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>First name</Label>
          <Input
            value={firstName}
            autoComplete="off"
            onFocus={() => {
              setActiveField('firstName');
              setOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!containerRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 150);
            }}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
          />
          {errors?.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
        </div>
        <div>
          <Label>Last name</Label>
          <Input
            value={lastName}
            autoComplete="off"
            onFocus={() => {
              setActiveField('lastName');
              setOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!containerRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 150);
            }}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
          />
          {errors?.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            autoComplete="off"
            onFocus={() => {
              setActiveField('email');
              setOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!containerRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 150);
            }}
            onChange={(e) => handleFieldChange('email', e.target.value)}
          />
          {errors?.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={phone}
            autoComplete="off"
            onFocus={() => {
              setActiveField('phone');
              setOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (!containerRef.current?.contains(document.activeElement)) {
                  setOpen(false);
                }
              }, 150);
            }}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
          />
        </div>
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {suggestions.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={cn(
                'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800',
                selectedCustomerId === customer.id && 'bg-brand-50 dark:bg-brand-950',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(customer)}
            >
              <span className="font-medium text-stone-900 dark:text-stone-100">{customerDisplayName(customer)}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact info'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
