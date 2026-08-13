import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface MyAppointmentsOnlyToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function MyAppointmentsOnlyToggle({
  checked,
  onCheckedChange,
}: MyAppointmentsOnlyToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="my-appointments-only"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label
        htmlFor="my-appointments-only"
        className="cursor-pointer text-sm font-normal text-stone-600 dark:text-stone-300"
      >
        My appointments only
      </Label>
    </div>
  );
}
