import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface HideCancelledToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function HideCancelledToggle({ checked, onCheckedChange }: HideCancelledToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="hide-cancelled" checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor="hide-cancelled" className="cursor-pointer text-sm font-normal text-stone-600">
        Hide cancelled
      </Label>
    </div>
  );
}
