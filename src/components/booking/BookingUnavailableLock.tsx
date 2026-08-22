import { PageSeo } from '@/components/seo/PageSeo';
import {
  publicBookingLockMessage,
  type PublicBookingLockReason,
} from '@/lib/trial';
import { PublicBookingSeo } from '@/components/booking/PublicBookingSeo';
import { BookingPublicShell } from '@/components/booking/BookingPublicShell';
import type { PublicOrganization } from '@/lib/public-booking';

interface BookingUnavailableLockProps {
  slug?: string;
  reason: PublicBookingLockReason;
  /** Present when GET org succeeded but booking is still locked (e.g. path off). */
  organization?: Pick<
    PublicOrganization,
    'name' | 'slug' | 'city' | 'address' | 'phone' | 'bookingSite'
  > | null;
}

/**
 * Same unbranded lock chrome canceled shops already use. Expired uses this
 * shell too, with expired copy — not the live 4-step wizard.
 */
export function BookingUnavailableLock({ slug, reason, organization }: BookingUnavailableLockProps) {
  const message = publicBookingLockMessage(reason);
  const title = reason === 'expired' ? 'Trial expired' : 'Booking unavailable';

  return (
    <BookingPublicShell showPoweredBy>
      {organization ? (
        <PublicBookingSeo
          name={organization.name}
          slug={organization.slug}
          city={organization.city}
          address={organization.address}
          phone={organization.phone}
          branding={organization.bookingSite?.branding ?? null}
          indexable={false}
        />
      ) : (
        <PageSeo
          title={title}
          description={message}
          path={slug ? `/book/${slug}` : '/'}
          robots="noindex,follow"
        />
      )}
      <p className="text-center text-neutral-600">{message}</p>
    </BookingPublicShell>
  );
}
