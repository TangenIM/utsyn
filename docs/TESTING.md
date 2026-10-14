# Testing and verification

Run commands from the repository root. Start with the [README](../README.md) if configuration is not ready. Tests must not use the production database or send unplanned SMS.

## Routine checks

```sh
npm ci
npm run check
npm audit --omit=dev
```

`check` runs ESLint, TypeScript, the unit suite, and a production build. It does not run the database integration suite or send SMS. Individual commands are `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

GitHub Actions runs a clean Node.js 24 install, these checks, and the production dependency audit on pushes and pull requests. A successful build does not establish database connectivity or provider delivery; check the running service as well.

For first deployment, run `npm run doctor` with `SETUP_TOKEN` still configured. It checks the connection and initial environment fields without creating tables or contacting Twilio. After setup, the token is deliberately removed; use `/api/health` for database readiness rather than treating its missing-token result as a production fault.

## HTTP and PostgreSQL integration suite

This suite creates users, bookings, settings, menus, layouts, and simulated SMS attempts. It checks invalid inputs, permissions, concurrency, and persistence through real HTTP requests and SQL. It refuses a non-local database, a name not ending in `_test`, a non-local server, or a database already containing users. It never clears an existing database.

Use a **new local test database for every run**. The local PostgreSQL service and client tools must already be installed. Replace `LOCAL_DATABASE_USER` below with your local database user. No production credentials are needed.

1. Create an empty database:

```sh
createdb -h 127.0.0.1 -p 5432 -U LOCAL_DATABASE_USER -W utsyn_integration_test
```

If that name already exists from a prior run, use another new name ending in `_test`, such as `utsyn_integration_2_test`. Do not delete an unfamiliar database just to run the suite.

2. Open terminal A in the repository. Set environment values for this process. These override `.env.local` and keep tests separate from any real account. The password in the URL must be URL-encoded. The setup value below is only a local test value.

PowerShell:

```powershell
$env:DATABASE_URL='postgres://LOCAL_DATABASE_USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/utsyn_integration_test'
$env:JWT_SECRET='local-integration-only-secret-at-least-32-characters'
$env:SETUP_TOKEN='local-integration-only-setup-token'
$env:APP_URL='http://127.0.0.1:3002'
$env:SMS_PROVIDER='disabled'
$env:TRUST_PROXY='true'
```

Linux/macOS:

```sh
export DATABASE_URL='postgres://LOCAL_DATABASE_USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/utsyn_integration_test'
export JWT_SECRET='local-integration-only-secret-at-least-32-characters'
export SETUP_TOKEN='local-integration-only-setup-token'
export APP_URL='http://127.0.0.1:3002'
export SMS_PROVIDER='disabled'
export TRUST_PROXY='true'
```

If a production `.env.local` has `DATABASE_SSL=require` or a private `DB_CA_CERT`, override those values for a non-TLS local test database as well: PowerShell `$env:DATABASE_SSL='disable'`; shell `export DATABASE_SSL='disable'`. The local PostgreSQL server must accept this connection. Do not weaken the production database's TLS configuration.

3. Build and start the isolated instance in terminal A:

```sh
npm run build
npm start -- --hostname 127.0.0.1 --port 3002
```

Keep it running. `TRUST_PROXY=true` lets this suite simulate different client addresses. Binding to loopback is essential: this test instance has fixed test secrets and is not a public deployment.

4. Open terminal B in the same repository and set the test runner's values to match terminal A.

PowerShell:

```powershell
$env:TEST_DATABASE_URL='postgres://LOCAL_DATABASE_USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/utsyn_integration_test'
$env:TEST_SETUP_TOKEN='local-integration-only-setup-token'
$env:TEST_BASE_URL='http://127.0.0.1:3002'
npm run test:integration
```

Linux/macOS:

```sh
export TEST_DATABASE_URL='postgres://LOCAL_DATABASE_USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/utsyn_integration_test'
export TEST_SETUP_TOKEN='local-integration-only-setup-token'
export TEST_BASE_URL='http://127.0.0.1:3002'
npm run test:integration
```

5. Read the result. The verified suite completed 136 checks. If it fails, inspect the first assertion and the test server log. Rerun against another fresh database after fixing the cause.
6. Stop terminal A with Ctrl+C. Close both test shells to remove their temporary variables. Dispose of the known test database according to your local database process.

The runner uses test cookies as HTTP headers, rather than a browser login flow. Browser checks remain necessary for rendering and cookie behavior on the deployed HTTPS origin.

## Manual browser checklist

Use an isolated instance with SMS disabled unless you are deliberately checking real delivery with an agreed recipient.

- Public pages: Norwegian and English; home links, menu, phone/contact links, images, language choice, booking form, validation, and confirmation code.
- Widths: 320, 390, 768, and 1440 pixels. Check scrolling, text, buttons, dialogs, navigation, and horizontal overflow.
- Booking: closed date, special open date, past date, invalid phone, full slot, valid submission, and replay after a lost response. A replay must not create another booking.
- Login: correct and incorrect password, logout, protected pages, expired or removed user.
- Users: create staff, reload, check permissions, delete, verify the old session cannot access data.
- Reservations and tables: date/status filters, seats, conflicts, confirmation, cancellation, no-show, completed status, restoration, and layout save/reset/reload.
- Menus and settings: create/edit/save/reload/delete; both language versions and daily selection.
- Keyboard: visible focus, form labels, Tab inside dialogs, Escape to close, confirmation heading focus, and scroll reset after booking.
- Persistence: restart the app and, in a controlled test, PostgreSQL. Recheck users, menus, bookings, layouts, and health.
- SMS: follow the real-delivery procedure in [SMS](SMS.md). Check provider status, not only the application's response.

Inspect the browser console for JavaScript errors. This checklist is a functional regression check, not a formal accessibility certification.

## Verification report — 14 October 2026

The following checks were completed for stabilization commits [9ba098b](https://github.com/TangenIM/utsyn/commit/9ba098b328ffbbf02c23df5f9e5054a28a652137) and [eda3a14](https://github.com/TangenIM/utsyn/commit/eda3a14d59de1c4a846c2d5022ec1fd99e91dd25). Environment: Node.js 24.19, Next.js 16.4.0, React 19.3.0, isolated PostgreSQL 17.9, and Microsoft Edge controlled through Playwright.

| Check | Result |
| --- | --- |
| Lint and TypeScript | Passed |
| Unit suite | Four tests passed, including strict types, phone normalization, dates, Oslo slots, and trusted proxy boundaries |
| Production build | Passed |
| HTTP/PostgreSQL integration | 136 checks passed |
| Browser regression | 25 checks passed; no JavaScript page errors |
| Confirmation regression | Six additional Norwegian/English flows at 320, 390, and 1440 px passed; no overflow or extra SMS |
| Production browser operations | Booking, menu CRUD/persistence, settings save, cancellation, and staff account checks passed |
| Application and PostgreSQL restarts | Saved users, password hashes, reservations, menus, SMS records, and layouts remained; health recovered |
| Real Twilio messages | Four English event messages and Norwegian received/cancelled messages reported delivered |
| Production dependency audit | Zero vulnerabilities reported at verification time |
| CodeRabbit CLI | Three stabilization reviews; all nine findings corrected. Fourth mobile review completed with zero findings |
| Remote CI | Both code commits passed; [final code verification run](https://github.com/TangenIM/utsyn/actions/runs/38580476609) |

API checks include simultaneous first-user setup, administrator deletion races, deleted-user session rejection, redacted secrets, origin checks, client-specific login limits, invalid dates/booleans/numbers, atomic capacity, table conflicts, duplicate notification suppression, uncertain-send recovery guards, day-layout reset, menu transactions, and failed-write rollback.

Private trial credentials, recipient numbers, test database exports, and screenshots containing guest data are not included in Git. The real SMS test used an explicitly authorized recipient; it does not validate the school's future Twilio account.

## Dependency status and limits

Runtime dependencies and the lockfile were updated. Unused Cloudflare deployment dependencies, obsolete host configuration, duplicate starter assets, and unused utility code were removed. ESLint 9.39.5 and TypeScript 6.0.3 were retained as the compatible versions tested with the current Next.js plugins/parser; attempted ESLint 10 and TypeScript 7 upgrades failed those checks.

The full development dependency audit had five high-severity entries from one unresolved `braces` advisory in the lint dependency chain. Production dependencies had zero reported vulnerabilities. The forced npm fix would downgrade the framework lint configuration, so it was not applied. Check the current advisory status before deployment with `npm audit`; do not treat this dated report as a permanent security guarantee.

These results establish tested behavior for this code and local configuration. They cannot certify every input or an untested future deployment. Exact-slot seating, staff-driven SMS recovery, backups, retention, and hosting requirements are documented in [Operations](OPERATIONS.md). Repeat the README's go-live checks on the school's actual service.
