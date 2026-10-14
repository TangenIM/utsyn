# Operations reference

For first installation, use the [README](../README.md). Detailed steps are in [Deployment](DEPLOYMENT.md), [Configuration](CONFIGURATION.md), [SMS](SMS.md), [Maintenance](MAINTENANCE.md), [Testing](TESTING.md), and [Troubleshooting](TROUBLESHOOTING.md). Staff should use the [Norwegian guide](STAFF_GUIDE.no.md); developers can use the [source and data guide](DEVELOPMENT.md).

## Hosting and data

Use Node.js 24 LTS and PostgreSQL with persistent storage. Users, reservations, menus, SMS attempts, and floor layouts live in PostgreSQL. Database initialization serializes schema changes with a transaction lock. Back up the database before upgrading an existing installation.

Publish through HTTPS. Put a gateway or reverse proxy in front of Next.js, limit API bodies to 32 KiB, and replace client-supplied `X-Forwarded-For` with the verified client IP. Prevent direct access to the application server, then set `TRUST_PROXY=true`. Login and booking limits use the last address in that controlled header if it is valid. Without explicit trust, headers are ignored and unknown clients share a conservative limit. Set the exact public origin in `APP_URL`. Foreign-origin mutation requests are rejected. Monitor `/api/health`: 200 means the database is ready; 503 means unavailable. It returns no credentials or guest data.

Each application process uses up to five PostgreSQL connections. Reserve enough connections for your number of instances. The school operator manages hosting, HTTPS, access control, backups, recovery tests, monitoring, and retention of guest information. Choose a retention period before opening the site to the public.

## SMS behavior

Events are new booking, table confirmation, cancellation, and no-show. New bookings remain unconfirmed until staff assign enough seats and confirm them. Repeating the same status change does not send another notification. Booking retries with the same request key return the existing booking.

Norwegian messages use templates in **Innstillinger**. English bookings use built-in English messages. Placeholders are `{kode}`, `{dato}`, `{tid}`, and `{antall}`. Availability uses Europe/Oslo time. Eight-digit phone numbers are interpreted as Norwegian; other numbers require international format.

Server environment variables override SMS provider settings and credentials in the database. A blank token field preserves the stored token. Tokens are never returned by the settings API. `SMS_PROVIDER=disabled` records attempts without contacting a provider. Webhook mode sends HTTPS JSON with `phone` and `message`; a successful response confirms webhook acceptance only.

A booking and its notification attempt are committed before the provider is called. SMS failure does not undo a booking. **Hos leverandøren** means accepted for processing; **Sendt** means sent by the provider; **Levert** confirms delivery. **Oppdater leveringsstatus** queries Twilio. The screen shows the 50 latest attempts and refreshes up to 10 outstanding messages per request.

Use **Prøv igjen** for failed notifications that still match the current reservation status. Concurrent retries are rejected. A timeout or process interruption during sending can leave delivery uncertain. Check Twilio logs before sending manually. Automatic retries of uncertain failures are blocked to avoid duplicate messages. There is no background retry worker; pending attempts after a restart remain visible for staff recovery.

Twilio trials require verified recipients and include trial branding. Production needs a school-owned account, an SMS sender, balance, and any registration or destination permissions Twilio requires. Local trial tests cannot verify the school's future account configuration.

## Booking and seating rules

Capacity and table conflicts apply to the exact date and arrival time slot. The application does not estimate meal duration or prevent reuse at a later slot. If seatings overlap in practice, use discrete service times and assign tables accordingly. Staff must confirm the operating rules before publishing opening times.

Special dates override the weekly schedule. Closed dates accept no bookings; special open dates require explicit slots. Past dates and elapsed slots for today are rejected. Cancelled and no-show bookings release capacity and table assignments; completed bookings retain them for that slot. Restoring checks capacity and requires staff to assign tables again, so an old assignment cannot occupy a table another booking has taken.

Floor layouts save to PostgreSQL for all staff as a permanent layout or date override. They survive browser and server restarts. Partial layouts retain default positions for other tables.

## Checks and updates

`npm ci` installs the reviewed lockfile. `npm run check` runs lint, type checking, boundary tests, and a production build. `npm audit --omit=dev` checks production dependencies. GitHub Actions runs these on pushes and pull requests.

`npm run doctor` checks configuration and PostgreSQL without printing secrets or sending SMS. Its setup-token check is for first deployment; remove `SETUP_TOKEN` after creating the first administrator.

For HTTP/database integration checks, start a separate instance with a fresh local database ending in `_test`, `SMS_PROVIDER=disabled`, and `TRUST_PROXY=true` so tests can simulate client addresses. Bind it to loopback only. Set `TEST_DATABASE_URL`, `TEST_SETUP_TOKEN`, and optional `TEST_BASE_URL` in the test shell, then run `npm run test:integration`. The suite refuses a database with users and never clears one. Discard the isolated database afterward.

Tooling uses the latest compatible ESLint 9 and TypeScript 6 releases. ESLint 10 and TypeScript 7 failed with the current Next.js lint plugins and parser. Upgrade when upstream compatibility is available. The development-only lint dependency chain currently has a `braces` advisory; npm's forced fix downgrades the framework lint configuration. Production dependencies have no advisories in the checked lockfile. Recheck registry advisories before deployment.

## Recover service

If health checks fail, inspect the database service, URL, firewall, and TLS certificate. Check saved reservations before asking guests to repeat requests whose browser response was lost.

Authorization checks active database users on each request. Removed staff lose access immediately. Keep a separate administrator for recovery. The last administrator cannot be deleted. The user interface creates and deletes accounts; it does not edit existing roles or passwords.

Back up PostgreSQL daily with provider backups or `pg_dump` and test restoration to a separate database. Keep environment files, database exports, provider tokens, and guest records out of Git. Rotate exposed credentials through the provider and replace the host's private variables.
