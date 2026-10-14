# Backups, recovery, updates, and migration

Use the [configuration guide](CONFIGURATION.md) for credentials and the [deployment guide](DEPLOYMENT.md) for the running service. Assign a school operator to these tasks before opening public bookings.

## What must be preserved

PostgreSQL holds users and password hashes, settings, opening days, special dates, reservations, table definitions and assignments, floor layouts, menu categories and dishes, daily menus, SMS attempts, and rate-limit records. Restarting or replacing the web server should not delete them.

Keep a separate private record of the host configuration, `JWT_SECRET`, database access details, and Twilio account access. A database export does not include environment variables. A token saved through the admin screen may be in the database backup, so treat all exports as sensitive.

## Daily backups

1. Enable the database provider's automated backups, or schedule `pg_dump` using PostgreSQL client tools.
2. Save backups outside the application server. Restrict access and use encrypted storage.
3. Set a retention period and check that the latest backup completed. Consider whether the provider offers point-in-time recovery if losing a day's bookings is unacceptable.
4. Restore a backup to a separate database periodically. A file that has never been restored is not a verified recovery plan.

Use `pg_dump` from the same major PostgreSQL version as the server or a supported newer client. These commands use placeholders, prompt for the password, and create a custom-format backup. Run them from a private backup directory outside the Git checkout:

```sh
pg_dump -h DATABASE_HOST -p 5432 -U DATABASE_USER -W -d DATABASE_NAME --format=custom --no-owner --no-acl --file=utsyn-backup.dump
```

For TLS, configure the PostgreSQL client according to the provider's certificate instructions; the application's `DATABASE_SSL` does not configure `pg_dump`. For scheduled backups use a protected password file or the provider's secret facility, rather than a password in command-line arguments. PostgreSQL documents [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) and [password files](https://www.postgresql.org/docs/current/libpq-pgpass.html).

## Restore a backup safely

1. Create a new empty database and a user with access to it. Never start by overwriting the only production copy.
2. Restore the backup with PostgreSQL client tools:

```sh
pg_restore -h RESTORE_HOST -p 5432 -U RESTORE_USER -W -d EMPTY_RESTORE_DATABASE --no-owner --no-acl --exit-on-error utsyn-backup.dump
```

3. Run a separate application against the restored database. Use a separate local `APP_URL` and `SMS_PROVIDER=disabled` so checks cannot message real guests.
4. Check login, reservation counts, menus, settings, layouts, and SMS history. A backup contains real guest data; restrict access and do not publish screenshots.
5. Record the backup time, restoration result, and how long recovery took.
6. For an actual incident, pause booking traffic before the final switch. Point the production application at the restored database, restore its private configuration, restart, and verify health and records before reopening traffic.

A restored database can contain old pending notifications. Do not enable SMS until staff have inspected them and checked provider logs for uncertain sends. Restoring records must not trigger duplicate messages.

## Update the application

1. Read the changes and [testing notes](TESTING.md). Check whether the database schema changes.
2. Back up the current database and record the currently deployed Git commit.
3. Test the new commit with a separate database or a protected restored copy with SMS disabled.
4. Pause booking traffic for deployment when using a single server. This also avoids modifying dependency files under a running process.
5. With a clean checkout on the intended branch, download the code and install the lockfile:

```sh
git status --short
git pull --ff-only
npm ci
npm run check
npm audit --omit=dev
```

If `git status` shows local changes, preserve and review them before pulling. Do not erase the operator's environment file. `npm run check` already performs the build.

6. Restart using the hosting platform or service manager. For the Linux sample: `sudo systemctl restart utsyn`.
7. Check `/api/health`, login, saved data, and a controlled booking. Inspect SMS logs before retrying any interrupted notification.
8. Reopen traffic and monitor errors.

Schema changes are applied automatically on API requests and serialized in the database. There is no separate migration command or automatic downgrade procedure.

## Roll back

Prefer redeploying the previously recorded commit into a separate release directory through the host's rollback feature. Keep its private variables and point it at the intended database. Do not run destructive Git commands against an operator's working directory.

Check schema compatibility before running older code against a newer database. If the update requires restoring a backup, bookings made since the backup would be lost unless transferred separately. Pause writes and have the database operator plan that recovery. Keep the failed installation available for diagnosis.

## Move to another host or domain

1. Prepare the new Node.js host, HTTPS domain, and gateway.
2. If keeping the database, permit access from the new host. If moving it, verify a backup restore first.
3. Copy private environment values through the school's secret manager. Keep `JWT_SECRET` consistent across instances.
4. Set `APP_URL` to the new public origin and confirm trusted proxy handling.
5. Pause writes, take a final backup if moving data, and restore it to the new database.
6. Start the new service and verify health, login, saved records, and SMS settings.
7. Change public domain routing, then run the README's deployed-site checks.
8. Keep the old service stopped to avoid accepting split bookings. Retain recovery material according to the school's policy.

## Guest information and monitoring

Agree who can view guest contact details and allergy comments, how long to retain them, and how to handle deletion requests. The application has staff-controlled reservation deletion, but no automatic retention scheduler, audit-trail product, or self-service guest account. Deleting a reservation does not erase provider message logs or existing backups; include those systems in the school's process.

Monitor health failures, database capacity, disk usage on the database, backup completion, repeated API errors, and failed SMS attempts. Keep logs private and do not log provider tokens or login cookies. Health response 200 establishes database readiness, not restaurant configuration, backup quality, or SMS delivery.
