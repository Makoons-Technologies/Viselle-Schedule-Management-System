import { cn } from '@/lib/utils';
import { SMS_UNDER_REVIEW_NOTICE } from '@/lib/sms';

interface SmsUnderReviewNoticeProps {
  className?: string;
}

export function SmsUnderReviewNotice({ className }: SmsUnderReviewNoticeProps) {
  return (
    <p
      role="status"
      className={cn(
        'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
        className,
      )}
    >
      {SMS_UNDER_REVIEW_NOTICE}
    </p>
  );
}
