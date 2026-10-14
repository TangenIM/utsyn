# Configuration

Return to the [README](../README.md) for installation steps.

## Where to put values

For local work, use `.env.local` at the repository root, next to `package.json`. Copy `.env.example` first. On a hosted service, use its private environment settings for the server. Do not use variables beginning with `NEXT_PUBLIC_` for credentials: those can be exposed to browsers.

Server environment values take precedence over files. For ordinary development and production runs, Next.js checks the environment-specific local file, `.env.local`, the environment-specific file, and `.env`, in that order. `doctor` reads `.env.local`, then `.env`, without replacing existing environment values. For predictable checks, keep this project's local values in `.env.local` and use host environment variables in production. Restart the server after changing configuration; updating a running process's source file does not update its environment.

Use one `NAME=value` per line. Quotes are helpful for values with spaces or multiline certificate text. Do not keep duplicate definitions across several files.

## Variables

| Name | What to enter | Required when |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL supplied by the database operator | Always |
| `DATABASE_SSL` | `require` to enable TLS with certificate verification | Provider requires TLS |
| `DB_CA_CERT` | PEM certificate for the database provider's private CA | Public certificate trust is insufficient |
| `JWT_SECRET` | A separate random secret, at least 32 characters; keep stable across restarts | Always |
| `SETUP_TOKEN` | A second random secret, at least 16 characters; remove after first-user setup | First installation only |
| `APP_URL` | Exact public HTTPS origin, or local HTTP origin during development | Always |
| `TRUST_PROXY` | `true` only behind a trusted gateway that replaces the client-IP header and blocks direct access; otherwise `false` | Recommended explicit value |
| `SMS_PROVIDER` | `disabled`, `twilio`, or `webhook` | Recommended explicit value |
| `TWILIO_ACCOUNT_SID` | Account SID beginning with `AC`, from the school's Twilio account | Twilio SMS |
| `TWILIO_AUTH_TOKEN` | Private auth token from that same account | Twilio SMS |
| `TWILIO_FROM_NUMBER` | SMS-capable sender belonging to that account, in `+countrycode...` format | Twilio SMS |
| `PORT` | Port used by the Next.js server; defaults to 3000 | Host uses another port |
| `NODE_ENV` | Production hosts normally set `production`; `next start` uses production mode | Host configuration |

The example file deliberately disables SMS. Leaving `SMS_PROVIDER=disabled` in the host environment overrides the provider selected in the admin screen.

For Twilio, each environment credential overrides its corresponding database setting. If no provider environment value is set, the provider chosen under **Innstillinger** is used. Prefer private host values for the school account so tokens are managed with the deployment. The legacy name `AUTHTOKEN` has no effect; copy its value privately into `TWILIO_AUTH_TOKEN` if migrating an older local configuration.

Webhook mode reads its HTTPS destination from `sms_webhook_url` in **Innstillinger**. There is no webhook environment variable in this application. See [SMS](SMS.md) for its payload and limits.

## Example production values

These are placeholders, not usable credentials:

```dotenv
DATABASE_URL=postgres://USER:URL_ENCODED_PASSWORD@DATABASE_HOST:5432/utsyn
DATABASE_SSL=require
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET
SETUP_TOKEN=REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET
APP_URL=https://utsyn.example.no
TRUST_PROXY=false
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=REPLACE_WITH_ACCOUNT_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_PRIVATE_AUTH_TOKEN
TWILIO_FROM_NUMBER=REPLACE_WITH_SMS_SENDER_IN_INTERNATIONAL_FORMAT
```

Set `TRUST_PROXY=true` only after satisfying the gateway rules in [Deployment](DEPLOYMENT.md). Remove `SETUP_TOKEN` after creating the first administrator.

## Database certificates

Ask the provider whether TLS is required and whether it supplies a CA certificate. Do not guess from the connection port. With `DATABASE_SSL=require`, certificate verification remains enabled. If the provider uses a private CA, enter its PEM certificate as `DB_CA_CERT`:

```dotenv
DB_CA_CERT="-----BEGIN CERTIFICATE-----\nCERTIFICATE_CONTENT_FROM_PROVIDER\n-----END CERTIFICATE-----"
```

In a host's secret editor, use actual line breaks if it expects a multiline value. In a quoted `.env.local` value, `\n` is expanded to line breaks. Do not paste the certificate's private key. The CA certificate and the Twilio token are different things.

## Secrets and recovery

Keep a private record of the database connection, JWT secret, provider credentials, and recovery administrator. Do not commit `.env`, `.env.local`, exported databases, cookies, or guest data. These files must remain private even when the repository is private.

Changing `JWT_SECRET` invalidates existing login cookies. All instances must use the same value. Changing a Twilio token requires updating the server value and restarting. A database backup may contain a Twilio token if it was saved through the admin screen; protect the backup accordingly.
