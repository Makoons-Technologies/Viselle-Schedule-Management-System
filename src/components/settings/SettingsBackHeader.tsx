import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsBackHeaderProps {
  title: string;
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function SettingsBackHeader({ title, backTo, onBack, actions, className }: SettingsBackHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <header className={cn('mb-6 flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-stone-900 dark:text-stone-100"
        onClick={handleBack}
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="min-w-0 flex-1 text-lg font-semibold text-stone-900 dark:text-stone-100">{title}</h1>
      {actions ? <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">{actions}</div> : null}
    </header>
  );
}
