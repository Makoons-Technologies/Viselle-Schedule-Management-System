import { LogOut, Palette } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemePicker } from '@/components/common/ThemePicker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Topbar() {
  const { user, logout } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId, selectedOrg } = useOrg();
  const { themeId, themes } = useTheme();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);

  const activeTheme = themes.find((t) => t.id === themeId);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {user?.role === 'platform_owner' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">Organization:</span>
            <Select
              value={selectedOrgId ?? 'none'}
              onValueChange={(v) => setSelectedOrgId(v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None selected</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOrg && (
              <span className="text-xs text-stone-400">/{selectedOrg.slug}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setThemeOpen((open) => !open)}
            title="Color theme"
            className="gap-2"
          >
            <Palette className="h-4 w-4" />
            <span
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ backgroundColor: activeTheme?.colors[600] }}
            />
          </Button>
          {themeOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close theme picker"
                onClick={() => setThemeOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-sm font-medium text-stone-900">Color theme</p>
                <ThemePicker compact onSelect={() => setThemeOpen(false)} />
              </div>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-stone-900">{user?.email}</p>
          <p className="text-xs capitalize text-stone-500">{user?.role?.replace('_', ' ')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
