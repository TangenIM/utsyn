# Troubleshooting

Begin with the visible error and the appropriate row below. Keep credentials, guest details, cookies, and database URLs out of public support messages. Ask the school operator for help when a step requires database or hosting access.

| Problem | Check first | Action |
| --- | --- | --- |
| `node` or `npm` is not found | Node.js installation and terminal PATH | Install Node.js 24 LTS; open a new terminal and check versions |
| `npm ci` fails | Correct folder, Node version, network, lockfile | Run from the folder containing `package.json`; preserve the lockfile and inspect the first error |
| Build fails | First lint/type/build error | Run `npm run check`; correct that error before deployment |
| Server will not start | A production build and free port | Run `npm run build`; stop the known process using the port or configure another `PORT` |
| `/api/health` returns 503 | PostgreSQL, connection URL, firewall, TLS | Check the database is running and reachable from the application host; use provider certificate settings |
| Health is good but pages fail | Server logs and restaurant settings | Health tests database readiness only; inspect the failed API and configuration |
| Setup form does not appear | Whether database users already exist | Existing users disable first-user setup; use an existing administrator |
| Setup token is rejected | Same token in form and running server | Check private configuration; restart after changes; never paste it into support logs |
| Login works then disappears | HTTPS, cookie settings, JWT secret | Use the exact configured origin and stable JWT secret on every instance |
| Mutation returns 403 | Origin, role, or setup token | Open the configured `APP_URL`; verify the account has permission for that action |
| Request returns 429 | Too many attempts or shared client limits | Wait for the limit window; have IT check trusted gateway configuration |
| Date or slot cannot be booked | Oslo date/time, opening rules, special date, cutoff, capacity | Review **Innstillinger** and the public availability screen |
| Confirmation is rejected | Enough active seats for this reservation | Reassign tables for the correct date/slot and confirm only after capacity is sufficient |
| A save appears lost | API response, selected date, reload, database | Check the saved record before repeating the action; ensure instances use the same database |
| SMS is disabled despite admin selection | `SMS_PROVIDER` in the host environment | Environment values override database settings; correct it and restart |
| SMS is queued or sent but not delivered | **SMS-logg** and Twilio logs | Refresh delivery status; inspect the provider error, destination permissions, and recipient |
| SMS retry is blocked | Current reservation state or uncertain delivery | Check the provider logs before sending manually; do not create a replacement booking |
| Menu is missing | Selected date, daily menu, active dish/category | Check both language fields and that dishes are selected for the service date |
| Data vanished after redeployment | Database URL and database persistence | Stop writes, verify which database is connected, and ask the operator to restore if needed |

## Read application logs

Use the hosting platform's private log viewer. For the Linux service example:

```sh
sudo journalctl -u utsyn -n 100 --no-pager
```

Record the time, route, HTTP status, and a short redacted error description. Do not publish the full environment or a database export. A browser error can occur after the server has committed a change; check the booking list and SMS log before repeating it.

## Recover administrator access

There is no public password-reset endpoint and no email service. Do not delete users or reservations to force first-time setup.

If another administrator can log in, ask that administrator to create a replacement account and remove the old one after access is restored. The interface does not edit passwords in place. Keep two administrators to make this recovery possible.

If nobody can log in, the school's database operator must perform a controlled recovery. First back up the database, confirm the affected user, and set a new bcrypt password hash using the application's `hashPassword` implementation or an equivalent bcrypt cost-12 operation. Do not store plaintext passwords in `password_hash`, change roles casually, or expose the database publicly. Verify login afterward and have the user replace temporary credentials through the school's managed recovery process. Changing `JWT_SECRET` invalidates existing sessions; it does not repair a forgotten password.

## A database certificate error

Check the provider's CA certificate, hostname, validity, and firewall. The application's `DATABASE_SSL=require` uses verification. Supply the correct `DB_CA_CERT` if the provider uses a private CA. Do not disable verification on a public production connection to hide an error.

## A failed deployment

Keep the previous release available. Restore service through the hosting platform's rollback or the process in [Maintenance](MAINTENANCE.md). Do not run `npm audit fix --force` or delete the production database as a general repair step. Check compatibility before running an older release against an updated schema.

## Where to continue

[Configuration](CONFIGURATION.md) explains variables. [SMS](SMS.md) explains provider states and safe retry. [Maintenance](MAINTENANCE.md) explains restore and migration. [Testing](TESTING.md) gives the isolated test procedure.
