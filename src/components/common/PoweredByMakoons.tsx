import { cn } from '@/lib/utils';

interface PoweredByMakoonsProps {
  className?: string;
}

/** Discreet platform attribution. Keep this subtle — it should never compete with the Viselle brand. */
export function PoweredByMakoons({ className }: PoweredByMakoonsProps) {
  return (
    <p className={cn('text-[11px] text-stone-400 dark:text-stone-600', className)}>
      Powered by Makoons Technologies
    </p>
  );
}
