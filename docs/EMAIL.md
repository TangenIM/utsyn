# Email notifications

Email is the default notification channel. Guests must enter an email address when they book. SMS stays available as a backup (see [SMS and Twilio](SMS.md)) and can be selected under **Innstillinger**, **Varslingskanal for gjester**.

## Events

The guest receives a message for four events: booking received, table confirmed, booking cancelled, and guest marked no-show. For each new booking, the staff addresses also receive a message with name, phone, email, comment, and booking code. A failure never undoes the reservation.

## Configure SMTP

Set these private variables on the host, then restart the service:

```dotenv
SMS_PROVIDER=email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=SENDER_ADDRESS
SMTP_PASSWORD=SMTP_OR_APP_PASSWORD
EMAIL_STAFF_RECIPIENTS=staff1@example.no,staff2@example.no
```

- Port 587 uses STARTTLS and port 465 uses TLS. Other ports are not supported.
- `SMTP_FROM` is optional and defaults to `SMTP_USER`. Gmail and Microsoft 365 only send as the logged-in account.
- A Gmail or Google Workspace account needs 2-step verification and an app password.
- `EMAIL_STAFF_RECIPIENTS` overrides the staff list in **Innstillinger**. Leave it unset to manage the list in the admin screen.
- Run `npm run doctor` to check the variables. It sends nothing.

`SMS_PROVIDER` in the host environment overrides the channel chosen in the admin screen. Existing installations with `disabled` stored in the database stay disabled until `SMS_PROVIDER=email` is set or the channel is changed in **Innstillinger**.

## Messages

The body text comes from the four templates in **Innstillinger** (Norwegian bookings) or the built-in English text. Placeholders are `{kode}`, `{dato}`, `{tid}`, and `{antall}`. The email adds a table with date, time, guests, and code.

## Check delivery

Open **Varslingslogg** on the reservations page. **Sendt** means the SMTP server accepted the message. Delivery to the inbox cannot be confirmed from here.

| Error code | Meaning | Action |
|---|---|---|
| `configuration_missing` | SMTP variables are missing | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` |
| `smtp_auth` | Login rejected | Check user and app password |
| `smtp_unreachable` | No connection to the SMTP server | Check host, port, firewall |
| `invalid_recipient` | Address rejected | Check the guest's address |
| `no_recipient` | Old booking without email | Contact the guest by phone |
| `smtp_error` | Other SMTP failure | Check the server log |

Use **Prøv igjen** after fixing the cause. Staff notification failures are written to the server log only.
