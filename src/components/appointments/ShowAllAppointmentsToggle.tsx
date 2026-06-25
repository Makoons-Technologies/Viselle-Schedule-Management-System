import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ShowAllAppointmentsToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ShowAllAppointmentsToggle({ checked, onCheckedChange }: ShowAllAppointmentsToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="show-all-appointments" checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor="show-all-appointments" className="cursor-pointer text-sm font-normal text-stone-600 dark:text-stone-300">
        Show all appointments
      </Label>
    </div>
  );
}
