import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-stone-500 dark:text-stone-400">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-brand-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
