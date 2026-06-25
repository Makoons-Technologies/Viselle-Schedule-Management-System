import { Input } from '@/components/ui/input';
import { cn, snapTimeToInterval, TIME_INPUT_STEP_SECONDS } from '@/lib/utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export function TimeInput({ value, onChange, className, id }: TimeInputProps) {
  return (
    <Input
      id={id}
      type="time"
      step={TIME_INPUT_STEP_SECONDS}
      className={cn(className)}
      value={value}
      onChange={(event) => onChange(snapTimeToInterval(event.target.value))}
    />
  );
}
