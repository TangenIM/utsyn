# Restaurant Utsyn

Booking and restaurant administration for Tangen videregående skole. Guests use Norwegian or English. Staff manage reservations, tables, menus, opening hours, users, and SMS delivery at `/admin`.

## What the school needs to provide

The code includes the website, administration, database initialization, and SMS integration. The school supplies:

- A host that runs a Node.js server, with Node.js 24 LTS and outbound HTTPS access.
- A persistent PostgreSQL database, its connection address, and backups.
- A public domain with HTTPS.
- Two private secrets for login sessions and first-administrator setup.
- For SMS: a school-owned Twilio account, its auth token, and an SMS-capable sender number.
- Staff accounts, correct opening times, menus, contact information, and a guest-data retention policy.

Bookings and logins need a running server. Uploading only HTML files to a static host will not work. Use the deployment instructions below for a Node.js host or Linux server. Other hosts must meet the same requirements; platform-specific adapters are not included.

## Start here

| Task | Guide |
| --- | --- |
| Install and start the site for the first time | Follow the numbered steps below |
| Deploy to a hosted Node.js service or Linux server | [Deployment](docs/DEPLOYMENT.md) |
| Understand every environment variable | [Configuration](docs/CONFIGURATION.md) |
| Use reservations, tables, menus, and staff accounts | [Staff guide, Norwegian](docs/STAFF_GUIDE.no.md) |
| Enable SMS and check actual delivery | [SMS and Twilio](docs/SMS.md) |
| Back up, restore, update, or move the site | [Maintenance](docs/MAINTENANCE.md) |
| Run tests and see what was verified | [Testing and verification](docs/TESTING.md) |
| Fix a failed login, booking, database connection, or SMS | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| Understand the source code and stored data | [Developer guide](docs/DEVELOPMENT.md) |
| Look up operating rules and limitations | [Operations reference](docs/OPERATIONS.md) |

## First installation, step by step

Run terminal commands inside the `utsyn` folder. Commands in this section work in PowerShell and a Linux/macOS shell unless stated otherwise. Replace example values before using them. Never commit a real environment file, database export, or provider token.

### 1. Install the tools and download the repository

Install Git and Node.js 24 LTS on the machine that will build and run the website. Check the versions:

```sh
git --version
node --version
npm --version
git clone https://github.com/TangenIM/utsyn.git
cd utsyn
```

`node --version` should start with `v24.`. `npm` is included with Node.js. If you already have the repository, open its folder instead of cloning another copy.

### 2. Create a PostgreSQL database

Use the school's database provider or an existing PostgreSQL server. Create a database for Utsyn and a separate database user. That user needs access to this database and permission to create and alter its tables. Obtain the connection URL from the provider:

```text
postgres://USER:PASSWORD@HOST:5432/DATABASE
```

The capitalized words are placeholders. A password containing URL punctuation must be URL-encoded; use the provider's generated connection URL where possible. Do not paste the real URL into a public issue or chat.

You do not need to import a schema file. The application creates its tables and default settings on the first API request. On later starts it applies its included additive schema changes without clearing records. Back up an existing database before running updated code.

### 3. Create the private configuration

For local use, copy the example file. On a hosted service, enter these values in its private server environment settings instead.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Linux/macOS:

```sh
cp .env.example .env.local
```

Run this command twice to generate **two different** secrets:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Open `.env.local` in your editor and set:

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=PASTE_THE_FIRST_GENERATED_SECRET
SETUP_TOKEN=PASTE_THE_SECOND_GENERATED_SECRET
APP_URL=http://localhost:3000
TRUST_PROXY=false
SMS_PROVIDER=disabled
```

For a public deployment, set `APP_URL` to the exact HTTPS origin, such as `https://utsyn.example.no`. Do not add `/admin`, another path, or query parameters. For local use, open the same hostname you put in `APP_URL`; `localhost` and `127.0.0.1` are different origins.

If your database provider requires TLS, set `DATABASE_SSL=require`. If it uses a private certificate authority, also supply `DB_CA_CERT`. [Configuration](docs/CONFIGURATION.md) explains certificates, file precedence, and every variable.

Keep SMS disabled while checking installation. To enable real messages later, follow [SMS and Twilio](docs/SMS.md). The production variable is `TWILIO_AUTH_TOKEN`; an old variable named `AUTHTOKEN` is not read by the application.

### 4. Install and check the application

```sh
npm ci
npm run doctor
npm run check
```

- `npm ci` installs the exact versions in the lockfile.
- `doctor` checks the initial configuration and database connection. It prints no secrets, sends no SMS, and does not create tables.
- `check` runs lint, type checking, unit tests, and a production build.

Fix any failed step before continuing. `doctor` requires the setup token for first installation. After you remove that token in step 6, use the health endpoint and normal checks to verify the running installation.

### 5. Start the server

To run the production build created by `check`:

```sh
npm start
```

Leave this terminal open and visit `http://localhost:3000`. Open `http://localhost:3000/api/health` as well: a successful response has HTTP status 200. A database failure returns 503. Use a service manager or the hosting platform to keep a public server running; closing a local terminal stops it.

For editing code locally, use `npm run dev` instead. The development server is not the production start command.

### 6. Create the first administrator

1. Open `/admin` on the running website.
2. If no users exist, the setup form appears. Enter the value of `SETUP_TOKEN` and choose an administrator username, display name, and password.
3. Use a password with at least 12 characters and at most 72 UTF-8 bytes. Most ordinary English passwords use one byte per character; emoji can use several.
4. Submit the form, then log in with that account.
5. Remove `SETUP_TOKEN` from the private host settings or `.env.local` and restart the application. Existing logins do not need this token. First-user setup is also blocked once an account exists.
6. Create a second administrator for recovery and individual staff accounts. Keep the secrets in the school's password manager.

There is no email-based password-reset service. Recovery requires another administrator or the school's database operator. See [Troubleshooting](docs/TROUBLESHOOTING.md).

### 7. Configure the restaurant

In `/admin`, check **Innstillinger**, **Meny**, and **Bord** before accepting guests:

1. Replace default Norwegian and English page text, address, phone, email, and prices.
2. Set capacity, booking cutoff, weekly opening days, and arrival slots.
3. Add school holidays, closures, and special opening dates.
4. Enter both language versions of menu categories and dishes; select the dishes for each service date.
5. Set active tables and their capacities, then save the room layout.
6. Confirm how long each service lasts. Capacity and table conflicts apply to the **exact arrival slot**; later slots do not automatically account for guests still dining.
7. Enable Twilio when the school is ready to send real SMS.

The [Norwegian staff guide](docs/STAFF_GUIDE.no.md) explains the daily workflow. Providing an email address on a booking stores the address; this application does not send email notifications.

### 8. Verify the deployed site before publishing

- Open the public homepage and booking page on a phone and computer; switch between Norwegian and English.
- Check `/api/health` returns 200.
- Create one test booking with a phone number whose owner agrees to receive test messages. Note its booking code.
- Reload the admin page and confirm the booking is still present.
- Assign enough seats and confirm the reservation.
- If SMS is enabled, open **SMS-logg**, refresh delivery status, and verify **Levert** for the expected events. Provider acceptance alone does not prove delivery.
- Cancel the test reservation so it does not occupy capacity for a real service.
- Restart the deployed application and check login, reservations, menus, and table layout again.
- Enable backups, test one restore to a separate database, and assign a person to monitor failures.

The hosting gateway must overwrite `X-Forwarded-For` with the verified client IP and block direct access to the application before you set `TRUST_PROXY=true`. Otherwise leave it `false`; users then share conservative rate limits. See [Deployment](docs/DEPLOYMENT.md).

These steps verify the school's actual domain, database, and Twilio account. The existing [verification report](docs/TESTING.md) records the checks already completed on the code and isolated test configuration.

## Project team

Iusup developed the frontend, backend, database, deployment, and fixes. Nell contributed customer meetings, user testing, planning, Figma design, and early database concepts. Helle contributed customer meetings, user support, concepts, Figma design, and early database solutions.
