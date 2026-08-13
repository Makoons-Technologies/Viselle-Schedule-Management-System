import { smsOptInStatement, VISELLE_PRIVACY_URL, VISELLE_TERMS_URL } from '@/lib/legal';
import { cn } from '@/lib/utils';

interface SmsOptInCheckboxProps {
  brandName: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  /** Booking forms are forced light — avoid dark: autofill/contrast variants. */
  lightOnly?: boolean;
  className?: string;
  textClassName?: string;
  linkClassName?: string;
}

export function SmsOptInCheckbox({
  brandName,
  checked,
  onCheckedChange,
  id = 'sms-opt-in',
  lightOnly = false,
  className,
  textClassName,
  linkClassName,
}: SmsOptInCheckboxProps) {
  const linkClass = cn(
    'font-medium underline underline-offset-2',
    lightOnly ? 'text-neutral-800 hover:text-neutral-950' : 'text-brand-700 hover:text-brand-800 dark:text-brand-300',
    linkClassName,
  );

  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[var(--booking-primary,#2563eb)] focus:ring-2 focus:ring-offset-0',
          lightOnly ? 'bg-white accent-[var(--booking-primary,#2563eb)]' : 'accent-brand-600',
        )}
      />
      <span className={cn('text-xs leading-5', textClassName)}>
        {smsOptInStatement(brandName)}{' '}
        View our{' '}
        <a href={VISELLE_TERMS_URL} target="_blank" rel="noreferrer" className={linkClass}>
          Terms
        </a>{' '}
        and{' '}
        <a href={VISELLE_PRIVACY_URL} target="_blank" rel="noreferrer" className={linkClass}>
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
