import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Palette, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { orgApi, ownerApi, ApiError } from '@/lib/api';
import {
  BOOKING_IMAGE_ACCEPT,
  DEFAULT_THEME_PALETTES,
  DEFAULT_UI_OPACITY,
  MAX_BOOKING_ASSET_BYTES,
  THEME_PALETTE_FIELDS,
  normalizeBookingBranding,
  readFileAsBase64,
  resolveThemePalette,
  resolveUiOpacity,
} from '@/lib/booking-branding';
import { useAuth } from '@/context/AuthContext';
import { useOrgWriteLocked } from '@/hooks/useOrgWriteLocked';
import { BookingPagePreview } from '@/components/booking/BookingPagePreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BookingBranding, SiteTemplate, ThemeColorPalette, WebsiteSettings } from '@/types/api';

const TEMPLATE_LABELS: Record<SiteTemplate, string> = {
  classic: 'Classic',
  modern: 'Modern',
  minimal: 'Minimal',
};

interface BookingBrandingSectionProps {
  orgId: string;
  website: WebsiteSettings;
  siteTemplate: SiteTemplate;
}

export function BookingBrandingSection({ orgId, website, siteTemplate }: BookingBrandingSectionProps) {
  const { user } = useAuth();
  const trialExpired = useOrgWriteLocked();
  const queryClient = useQueryClient();
  const isPlatformOwner = user?.role === 'platform_owner';
  const api = isPlatformOwner ? ownerApi : orgApi;

  const branding = normalizeBookingBranding(website.bookingBranding);
  const [localPalette, setLocalPalette] = useState<Required<ThemeColorPalette>>(() =>
    resolveThemePalette(siteTemplate, branding),
  );
  const [uiOpacity, setUiOpacity] = useState(Math.round(resolveUiOpacity(branding) * 100));

  useEffect(() => {
    setLocalPalette(resolveThemePalette(siteTemplate, normalizeBookingBranding(website.bookingBranding)));
  }, [siteTemplate, website.bookingBranding]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['website', orgId] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: BookingBranding) => api.updateWebsite(orgId, { bookingBranding: payload }),
    onSuccess: () => {
      invalidate();
      toast.success('Branding saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: (input: Parameters<typeof orgApi.uploadBookingAsset>[1]) => api.uploadBookingAsset(orgId, input),
    onSuccess: () => {
      invalidate();
      toast.success('Image uploaded');
    },
  });

  const saveBranding = (patch: BookingBranding) => {
    updateMutation.mutate(patch);
  };

  const savePaletteField = (key: keyof ThemeColorPalette, value: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    saveBranding({ themePalettes: { [siteTemplate]: { [key]: value.toLowerCase() } } });
  };

  const resetPalette = () => {
    const defaults = DEFAULT_THEME_PALETTES[siteTemplate];
    setLocalPalette(resolveThemePalette(siteTemplate, { themePalettes: { [siteTemplate]: defaults } }));
    saveBranding({ themePalettes: { [siteTemplate]: defaults } });
  };

  const handleOpacityCommit = () => {
    saveBranding({ uiOpacity: uiOpacity / 100 });
  };

  const uploadFile = async (assetType: 'logo' | 'favicon' | 'background', file: File) => {
    if (!file.type || !BOOKING_IMAGE_ACCEPT.split(',').includes(file.type)) {
      toast.error('Use a PNG, JPEG, WebP, SVG, GIF, or ICO image');
      return;
    }
    if (file.size > MAX_BOOKING_ASSET_BYTES) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }

    try {
      const dataBase64 = await readFileAsBase64(file);
      await uploadMutation.mutateAsync({
        assetType,
        fileName: file.name,
        contentType: file.type,
        dataBase64,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Upload failed';
      toast.error(message);
    }
  };

  const removeAsset = (field: 'logoUrl' | 'faviconUrl' | 'backgroundImageUrl') => {
    saveBranding({ [field]: null });
  };

  const previewBranding: BookingBranding = {
    ...branding,
    themePalettes: { [siteTemplate]: localPalette },
    uiOpacity: uiOpacity / 100,
  };

  const busy = updateMutation.isPending || uploadMutation.isPending || trialExpired;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          Look & branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>{TEMPLATE_LABELS[siteTemplate]} theme colors</Label>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Customize the color palette for your active page style. Switch styles above to edit
                Classic, Modern, or Minimal separately.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={resetPalette}>
              <RotateCcw className="h-4 w-4" />
              Reset to defaults
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_PALETTE_FIELDS.map(({ key, label, hint }) => (
              <div key={key} className="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{label}</p>
                <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">{hint}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localPalette[key]}
                    disabled={busy}
                    onChange={(e) =>
                      setLocalPalette((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    onBlur={(e) => savePaletteField(key, e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded border border-stone-200 bg-white p-1 dark:border-stone-600 dark:bg-stone-700"
                    aria-label={`${label} color`}
                  />
                  <Input
                    value={localPalette[key]}
                    disabled={busy}
                    onChange={(e) =>
                      setLocalPalette((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    onBlur={(e) => savePaletteField(key, e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="ui-opacity">Booking card transparency ({uiOpacity}%)</Label>
          <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
            Lower values let more of your background image show through the booking card.
          </p>
          <input
            id="ui-opacity"
            type="range"
            min={35}
            max={100}
            value={uiOpacity}
            disabled={busy}
            onChange={(e) => setUiOpacity(Number(e.target.value))}
            onMouseUp={handleOpacityCommit}
            onTouchEnd={handleOpacityCommit}
            className="w-full accent-brand-600"
          />
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Default: {Math.round(DEFAULT_UI_OPACITY * 100)}%</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <AssetField
            label="Header logo"
            description="Shown beside your business name at the top."
            imageUrl={branding.logoUrl}
            inputRef={logoInputRef}
            busy={busy}
            onPick={(file) => uploadFile('logo', file)}
            onRemove={() => removeAsset('logoUrl')}
          />
          <AssetField
            label="Page icon"
            description="Browser tab favicon for your booking page."
            imageUrl={branding.faviconUrl}
            inputRef={faviconInputRef}
            busy={busy}
            onPick={(file) => uploadFile('favicon', file)}
            onRemove={() => removeAsset('faviconUrl')}
          />
          <AssetField
            label="Background image"
            description="Full-page backdrop behind the booking card."
            imageUrl={branding.backgroundImageUrl}
            inputRef={backgroundInputRef}
            busy={busy}
            onPick={(file) => uploadFile('background', file)}
            onRemove={() => removeAsset('backgroundImageUrl')}
          />
        </div>

        <div className="min-w-0">
          <Label className="mb-2 block">Live preview ({TEMPLATE_LABELS[siteTemplate]})</Label>
          <BookingPagePreview template={siteTemplate} branding={previewBranding} className="min-w-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function AssetField({
  label,
  description,
  imageUrl,
  inputRef,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  description: string;
  imageUrl?: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{label}</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
      <div className="mt-3 flex h-20 items-center justify-center overflow-hidden rounded-md border border-dashed border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/60">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon className="h-6 w-6 text-stone-300 dark:text-stone-500" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={BOOKING_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          Upload
        </Button>
        {imageUrl ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
