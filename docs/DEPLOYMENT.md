# Deployment

This guide assumes you have completed steps 1–4 of the [README](../README.md). The production build and the running server are separate steps: `npm run build` creates the build; `npm start` serves it.

## Requirements on any host

| Requirement | Why it matters |
| --- | --- |
| Node.js 24 LTS and npm | Builds and runs this Next.js application |
| Persistent PostgreSQL | Stores users, bookings, settings, menus, tables, and SMS attempts |
| Outbound access to PostgreSQL and HTTPS | Connects to the database and SMS provider |
| Public HTTPS domain | Protects logins and guest information |
| Private server environment variables | Keeps credentials out of browser code and Git |
| Restart policy, logs, and monitoring | Restores service after a crash or server restart |
| Trusted gateway configuration | Supplies trustworthy client addresses for rate limits |

There is no required persistent application disk: business records are in PostgreSQL. The database storage must persist when application instances are replaced. Each application process can use up to five database connections; allow headroom for maintenance and more instances.

A static-only host is unsuitable. This repository contains no Cloudflare Worker or static-export adapter. A platform-specific serverless deployment needs that platform's supported Next.js integration, database connection limits, and request duration to be checked separately. The tested deployment model is a normal Node.js production server.

## Option A: managed Node.js hosting

1. Connect the host to this Git repository and choose the branch to deploy.
2. Set the repository root as the application directory: the directory containing `package.json`.
3. Select Node.js 24 LTS.
4. Set the install command to `npm ci`. The build environment needs development dependencies because ESLint and TypeScript are build tools. Do not omit them before building.
5. Set the build command to `npm run build`. Run `npm run check` in CI before deploying.
6. Set the start command to `npm start`. If the host supplies `PORT`, Next.js uses it. Otherwise the server uses 3000.
7. Add the values from [Configuration](CONFIGURATION.md) as private server variables. Make the database URL available to the running server; these pages need live data at request time.
8. Attach the public domain and enable HTTPS using the host's domain settings.
9. Set `APP_URL` to that exact public HTTPS origin, then restart or redeploy.
10. Confirm how the gateway handles `X-Forwarded-For`. Set `TRUST_PROXY=true` only when the host overwrites the incoming value with the actual client IP and prevents direct backend access. If it appends arbitrary client input or the guarantee is unclear, leave it `false` until the operator supplies a safe configuration.
11. Configure a health check on `/api/health`. Accept HTTP 200; investigate 503. Allow time for initial database setup.
12. Follow README steps 6–8 to create administrators, configure the restaurant, and check a real booking and SMS delivery.

Keep database backups separate from the deployment service. Deleting or replacing an application deployment must not delete the database.

## Option B: a Linux server

Use a dedicated service account and a service manager. The following sample uses `/srv/utsyn`, an account named `utsyn`, and Node.js installed as `/usr/bin/node`. Adapt the account, path, and executable to your server. Check `command -v node` first. Install Node.js and PostgreSQL using the school's approved package-management process.

1. Clone the repository to `/srv/utsyn` and make it readable by the `utsyn` account.
2. Put the private environment file at `/srv/utsyn/.env.local`. Restrict it to the service account. Do not put it in a public web directory.
3. In `/srv/utsyn`, run `npm ci`, `npm run doctor`, and `npm run check` as the service account. Do not build as root.
4. Create `/etc/systemd/system/utsyn.service` using this sample:

```ini
[Unit]
Description=Utsyn restaurant website
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=utsyn
Group=utsyn
WorkingDirectory=/srv/utsyn
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /srv/utsyn/node_modules/next/dist/bin/next start --hostname 127.0.0.1
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077

[Install]
WantedBy=multi-user.target
```

Next.js loads `.env.local` from the working directory. This file uses dotenv syntax; do not assume a systemd `EnvironmentFile` parses it identically.

5. Reload systemd and start the service:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now utsyn
sudo systemctl status utsyn
curl --fail http://127.0.0.1:3000/api/health
```

6. Put an HTTPS reverse proxy in front of the loopback server. Obtain and renew a certificate through the school's approved certificate process. Forward requests to `127.0.0.1:3000` and keep this port inaccessible from the public network.
7. Set the proxy's client-IP header by **replacement**, using the verified client address. Do not preserve arbitrary incoming values. For a single Nginx proxy directly facing clients, the relevant directives inside its existing HTTPS server are:

```nginx
location /api/ {
    client_max_body_size 32k;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

This is a location snippet, not a complete Nginx configuration or certificate setup. If a CDN or another proxy sits in front, `$remote_addr` may identify that proxy. The operator must establish the actual client address using only its trusted proxy ranges before replacing the forwarded header.

8. Set the public `APP_URL` and, once the gateway conditions are met, `TRUST_PROXY=true`. Restart with `sudo systemctl restart utsyn`.
9. Complete the public checks in the README. Read application logs with `sudo journalctl -u utsyn -n 100 --no-pager`. Restrict log access; do not publish logs containing guest details.

## Windows or container infrastructure

The application also runs with the same `npm ci`, `npm run build`, and `npm start` commands on a Windows Node.js server. The operator must supply a Windows service manager, HTTPS gateway, and restart policy; a developer terminal is not a durable deployment.

For containers, the operator can package a Node.js 24 image with the production build, `public`, package files, configuration, and runtime dependencies, then run `npm start`. Supply secrets at runtime and keep PostgreSQL on persistent storage. A ready-made Docker or Kubernetes configuration is not included or verified in this repository. Use the managed Node.js or Linux path above if you need the documented deployment without designing a container setup.

## Moving an existing installation

Keep the same database and `JWT_SECRET` if you want existing records and sessions to remain valid. If moving databases, restore a verified backup first. Update `APP_URL`, database access rules, provider variables, and trusted gateway configuration on the new host. Pause bookings during the final data transfer so changes cannot be lost. Test the new host before changing the public domain routing. See [Maintenance](MAINTENANCE.md).

## Go-live responsibilities

The repository supplies the application and the verification report. The school operator owns the domain, TLS renewal, server and database availability, backups, account credentials, Twilio balance and destination permissions, and access to guest information. Assign named owners and verify these on the deployed service before accepting public bookings.

## Reference documentation

The project's deployment commands use Next.js's [Node.js self-hosting model](https://nextjs.org/docs/app/guides/self-hosting). For an operator adapting the gateway, see Nginx's [proxy header directives](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header). These references explain the underlying tools; the school's actual gateway and certificate setup must match its infrastructure.
