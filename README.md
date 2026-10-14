# Restaurant Utsyn

Booking and restaurant administration for Tangen videregående skole. Guests use Norwegian or English. Staff manage reservations, tables, menus, opening hours, users, and SMS delivery at `/admin`.

## Deploy the site

Use a Node.js host with persistent PostgreSQL. A static file host cannot process bookings.

1. Clone `https://github.com/TangenIM/utsyn.git` and select Node.js 24 LTS.
2. Create a PostgreSQL database and a user permitted to create and alter tables.
3. Copy `.env.example` to `.env.local` for local use, or add its variables to the host's private environment settings. Set `DATABASE_URL`, `JWT_SECRET`, `SETUP_TOKEN`, and `APP_URL`. Production `APP_URL` must be your exact public HTTPS origin without a path.
4. Generate two separate secrets with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use one for `JWT_SECRET` and one for `SETUP_TOKEN`.
5. To enable Twilio, set `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. The sender must belong to that account and support SMS. Use international numbers such as `+47...`.
6. Run `npm ci`, `npm run doctor`, and `npm run check`. Configure the host's build command as `npm run build` and start command as `npm start`.
7. Open `/admin`, enter the setup secret, and create the first administrator. Passwords require at least 12 characters and at most 72 UTF-8 bytes. Remove `SETUP_TOKEN` from the host after setup.
8. Review opening hours, capacity, contact information, menus, and tables. Defaults are starting points. Place a test booking on the deployed site and check **SMS-logg** until Twilio reports **Levert**.

Configure your hosting gateway to replace `X-Forwarded-For` with the verified client IP and prevent direct access to Next.js, then set `TRUST_PROXY=true`. Leave it disabled for a directly exposed local instance; clients then share conservative rate limits. See the operations guide for this hosting requirement.

For local development, run `npm run dev` and open `http://localhost:3000`. Schema creation and additive migrations run automatically on the first API request. Existing records are retained.

For hosted PostgreSQL, use `DATABASE_SSL=require` to verify TLS certificates. Supply `DB_CA_CERT` if your provider uses a private CA. Follow the provider's connection instructions; do not disable verification to bypass a connection error.

See [Operations](docs/OPERATIONS.md) for backups, SMS recovery, configuration, and tests.

## Project team

Iusup developed the frontend, backend, database, deployment, and fixes. Nell contributed customer meetings, user testing, planning, Figma design, and early database concepts. Helle contributed customer meetings, user support, concepts, Figma design, and early database solutions.
