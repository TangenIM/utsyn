# SMS and Twilio

The website sends notifications for four events: booking received, table confirmed, booking cancelled, and guest marked no-show. Completing or deleting a reservation is not a notification event. An SMS failure does not delete or undo the reservation.

## Enable Twilio step by step

1. Use the school's Twilio account. Obtain its **Account SID** and **Auth Token** from its console. Treat the token like a password.
2. Choose an SMS-capable sender number belonging to that same account. Check Twilio's account requirements, balance, destination permissions, and sender restrictions for the countries you will message.
3. For a trial account, verify the intended recipient in Twilio before testing. Trial messages include provider branding and have account restrictions. Check the current [Twilio trial instructions](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).
4. Add these private server variables:

```dotenv
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACCOUNT_SID_FROM_THE_SCHOOL_ACCOUNT
TWILIO_AUTH_TOKEN=PRIVATE_AUTH_TOKEN_FROM_THE_SAME_ACCOUNT
TWILIO_FROM_NUMBER=SMS_SENDER_WITH_PLUS_AND_COUNTRY_CODE
```

5. Restart the application. If this is first installation and `SETUP_TOKEN` is still present, `npm run doctor` checks the environment-based Twilio fields as well. It does not send a test message or prove delivery.
6. Log in as an administrator and open **Innstillinger**. Check that the effective provider is Twilio. An environment value overrides the database selection. A blank token field keeps the previously stored token; it does not erase it.
7. Review the Norwegian templates. Keep them short and include the booking code, date, and time where useful. English bookings use the application's English templates.
8. Create a test booking through the actual public booking page with an agreed recipient. Follow the delivery checks below.

Use `+` followed by country code and number, without a national leading zero. The application interprets an eight-digit local number as Norwegian and adds `+47`. For a non-Norwegian number, always use international format.

The variable is `TWILIO_AUTH_TOKEN`, not `AUTHTOKEN`. Do not place a token in a URL, browser script, public environment variable, Git commit, or screenshot.

## Templates and language

The guest's selected language is saved with the booking. It determines later notifications even if the staff screen is in Norwegian.

| Placeholder | Value inserted |
| --- | --- |
| `{kode}` | Booking confirmation code |
| `{dato}` | Booking date in the guest's language |
| `{tid}` | Arrival time |
| `{antall}` | Number of guests |

Norwegian templates are editable in **Innstillinger**. English templates live in `src/lib/sms.ts`. Unsupported placeholder names remain ordinary text. Long messages or characters requiring Unicode can produce multiple billable SMS segments; check pricing and segmentation in the provider account.

## Verify actual delivery

1. Submit a new booking in Norwegian. Keep its code.
2. Open **SMS-logg** in administration and find the matching attempt.
3. Click **Oppdater leveringsstatus**. Repeat after a short wait if the provider is still processing it.
4. Confirm **Levert** and check the recipient's phone. A queued or accepted message is not proof of delivery.
5. Assign enough active seats and confirm the booking. Check the confirmation message the same way.
6. Cancel the test booking and check the cancellation message.
7. Use a separate agreed test booking to check **Møtte ikke**. This sends a no-show message; warn the recipient that it is a test.
8. Repeat the required language checks in English. Cancel test reservations after use so they do not occupy a real service.

Repeated submission with the same booking request key returns the existing record. Repeating an unchanged reservation status does not send another notification. Do not repeatedly create new bookings to test a stalled SMS.

## Status and recovery

| State | What it means | Next step |
| --- | --- | --- |
| Pending | Attempt saved, sending has not finished | Inspect after a restart; use recovery if offered |
| Sending/retrying | A send operation has claimed the attempt | Wait; if interrupted, check provider logs |
| Queued/accepted | Provider accepted it for processing | Refresh delivery status |
| Sent | Provider reports it sent | Refresh; sent does not mean delivered |
| Delivered | Provider reports delivery | No retry needed |
| Disabled | SMS was disabled when this event occurred | Check effective provider before future events |
| Failed/undelivered | Sending or delivery failed | Read error code; fix cause before retry |

The log shows the latest 50 attempts. Each refresh checks up to 10 outstanding messages. Delivery polling uses the Twilio message SID stored with the attempt; this integration does not require an inbound Twilio status-callback endpoint.

**Prøv igjen** is available only for eligible notifications that still match the reservation's current state. Concurrent retries are rejected. There is no automatic background retry worker. Staff must review attempts left pending after an interrupted process.

A timeout may occur after Twilio has already accepted a message. Errors such as `provider_unavailable`, `invalid_provider_response`, or `notification_unavailable` can mean delivery is uncertain. The application blocks unsafe retries in these cases. Check the Twilio message logs and the recipient before sending manually. Never assume that no successful browser response means no SMS was sent.

For a provider error code, look it up in the [Twilio error dictionary](https://www.twilio.com/docs/api/errors). Fix account permissions, recipient verification, balance, sender, or credentials as indicated. Do not publish tokens when asking for support.

## Disable SMS or use a webhook

Set `SMS_PROVIDER=disabled` and restart to stop provider calls. Bookings still work and attempts are recorded as disabled. Enabling SMS later does not automatically send old disabled attempts.

Webhook mode is an alternative integration for an operator who already runs an SMS gateway. Choose `webhook` and set the HTTPS webhook URL under **Innstillinger**. The application posts JSON:

```json
{"phone":"+4712345678","message":"Restaurant Utsyn: ..."}
```

The destination must accept HTTPS POST without redirects. No custom authorization-header configuration or delivery polling is included for this mode. A successful HTTP response proves webhook acceptance only; the UI's sent state is not an end-to-end delivery receipt. Use Twilio for the delivery-status workflow described above.

## Verification already completed

The authorized trial test on 14 October 2026 reported **delivered** for all four English events and for Norwegian received/cancelled events. No account credentials or recipient number are stored in this guide. This verifies the code with that trial configuration; the school must repeat delivery checks with its own account and deployment. See [Testing](TESTING.md).
