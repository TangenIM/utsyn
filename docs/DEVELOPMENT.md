# Developer guide

This project uses Next.js App Router, React, TypeScript, PostgreSQL through `postgres`, bcrypt password hashes, and signed login cookies. UI content is Norwegian/English; staff screens are Norwegian. [README](../README.md) contains setup commands and [Testing](TESTING.md) contains test procedures.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/page.tsx` | Public homepage |
| `src/app/bestill/page.tsx` | Guest booking flow |
| `src/app/admin` | Login/setup and staff dashboard pages |
| `src/app/api` | Server-side JSON endpoints |
| `src/components` | Shared navigation, dialogs, locale, accessibility controls, and SMS log |
| `src/lib/db.ts` | Database connection, additive schema initialization, and defaults |
| `src/lib/reservations.ts`, `availability.ts` | Booking, seating, and opening rules |
| `src/lib/sms.ts` | Templates, notification attempts, Twilio/webhook calls, delivery polling |
| `src/lib/validation.ts` | Input types, boundaries, phone/date validation, API errors |
| `src/lib/auth.ts` | Password hashing, signed cookies, active-user checks |
| `src/lib/client-ip.ts`, `rate-limit.ts` | Explicit proxy trust and database-backed limits |
| `src/lib/i18n.ts` | Guest interface translations |
| `src/proxy.ts` | Request guards and routing middleware |
| `public` | Static website images/assets |
| `tests/unit.mjs`, `tests/integration.mjs` | Unit boundaries and HTTP/database regression suite |
| `scripts/doctor.mjs` | Initial configuration diagnostic |
| `.github/workflows` | CI checks |
| `docs` | Staff, deployment, configuration, recovery, SMS, and verification guides |

Read `AGENTS.md` before changing code. The installed Next.js package includes the version-specific documentation under `node_modules/next/dist/docs`; use it when changing framework APIs.

## Local workflow

1. Use a separate local PostgreSQL database and `.env.local` as described in the README.
2. Set `SMS_PROVIDER=disabled` unless deliberately testing an agreed recipient.
3. Run `npm ci`, then `npm run dev`.
4. Keep `APP_URL` and the browser origin consistent.
5. Before a commit, run `npm run check`, inspect `git diff`, and check that no secrets or guest data are included.
6. For database/API changes, run the fresh-database integration procedure. For UI changes, check the affected browser flow and mobile widths.
7. If CodeRabbit CLI is used, review only a secret-free diff and assess its suggestions against actual behavior. Remote review is not a substitute for tests.

Use the committed lockfile. Upgrade related packages together, then verify compatibility. Do not replace a dependency solely because it has a newer major version. Record unresolved audit findings and distinguish production from development dependencies.

## Stored data and API types

The database schema is defined in `src/lib/db.ts`, not an external schema dump. On initialization a transaction lock serializes changes. SQL parameters are bound through the database library rather than concatenating guest input.

- IDs, guest counts, table capacities, and menu prices use integers. APIs expecting a number reject a numeric string. Guest counts are 1–60; restaurant capacity can be lower.
- Dates use validated `YYYY-MM-DD` text and slots use `HH:mm` text. Availability and booking cutoff use Europe/Oslo. Do not compare them as the host's local timezone.
- Boolean API fields must be JSON `true`/`false`, not strings. Admin settings are a separate string-valued key/value interface with explicit range validation.
- Prices are whole currency units, not floating-point values or fractional øre.
- Reservation locale is `no` or `en`. Status is `needs_seat`, `confirmed`, `cancelled`, `completed`, or `no_show`.
- Floor positions are JSONB; permanent and date-specific layouts are separate keys.
- Notification events, status, provider SID, and error code are stored separately from reservations.
- Password hashes are bcrypt, not reversible passwords. Login tokens expire after eight hours and active users/roles are checked against PostgreSQL on protected requests.

No guest account, payment processing, file-upload service, outbound email service, automatic retention worker, or inbound SMS processing is included.

## Main API groups

Use the source route files as the exact contract; this table identifies the intended callers rather than promising a versioned third-party API.

| Route group | Intended access and responsibility |
| --- | --- |
| `/api/health` | Public readiness check without guest data |
| `/api/setup` | Public setup-state check; protected first-administrator creation with setup token |
| `/api/auth`, `/api/auth/me` | Login/logout and current authenticated user |
| `/api/settings` | Public display settings; admin-only private settings and writes |
| `/api/availability` | Public date/slot availability |
| `/api/reservations` | Public validated booking creation; authenticated staff listing |
| `/api/reservations/[id]`, `/confirm` | Staff status/deletion and seating-aware confirmation |
| `/api/tables`, `/layout`, `/assignments` | Staff table capacity, room layout, and assignments |
| `/api/open-days`, `/api/closures` | Opening rules; writes require administration |
| `/api/menu`, `/categories`, `/daily` | Public menu reads; authenticated menu management |
| `/api/users` | Administrator-only account management |
| `/api/sms` | Staff notification log, provider-status refresh, and eligible retry |

Requests that change data must come from the configured origin where an Origin header is present. Enforce the public HTTPS origin and trusted gateway on the host too. Limits are shared through PostgreSQL rather than process memory.

## Booking and notification transactions

Booking capacity, assignments, status changes, and notification creation use database transactions and locks. A request key supports safe booking replay: the same key and payload return the existing reservation; a changed payload with that key is a conflict.

The reservation and its notification attempt commit before the provider call. A failed SMS response must not imply that the reservation failed. Provider calls have timeouts and uncertain outcomes require manual provider inspection. There is no background job queue to repair them automatically. Read [SMS](SMS.md) before changing retry behavior.

Seating uses exact date/arrival-slot conflicts, not meal-duration intervals. Cancelled and no-show records release seats; restoration checks capacity and clears old assignments. Table capacity changes can return affected under-seated confirmed reservations to `needs_seat`; staff must review and confirm again. These rules are integration-tested.

## Changing defaults or schema

Default content is initial installation data. Editing the defaults in source does not replace settings already stored in an existing database. Use the admin screen to change live content.

For schema changes, preserve existing records, add an idempotent migration in the initializer, and verify both a fresh database and a database from the prior release. Back up before deployment. Do not add destructive startup resets, live-test seeds, or commands that silently delete production data.
