# Phases 2–4 Implementation Plan (executed)

> Implemented in the same session after Phase 1 PWA ship.

**Goal:** Web Push + staff appointment reminders + low-stock % alerts over email/SMS/push.

## Delivered

### Phase 2 — Web Push
- Migration `039` `push_subscriptions`
- `web-push` service + `/api/v1/push/*` routes
- SW `push` / `notificationclick` handlers
- Settings: Enable notifications (General + Account)

### Phase 3 — Staff reminders
- Org toggles: staff email/SMS/push + hours before
- Reminder rows with `audience=staff`, types email|sms|push
- Cron delivery to assigned staff account

### Phase 4 — Low stock %
- Product `stock_capacity`, `low_stock_alert_percent`, `low_stock_notified_at`
- Alert on threshold cross (fixed and/or % of capacity)
- Org channel toggles for low-stock alerts

## Env required (API)

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@viselle.net
```

Generate: `npx web-push generate-vapid-keys`
