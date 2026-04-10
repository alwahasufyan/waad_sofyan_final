# Deploy To waadapp.ly

## 1. Environment File

Use [.env.production.example](.env.production.example) as the server `.env` base.

On the server:

```bash
cp .env.production.example .env
```

Generate a strong JWT secret (Linux):

```bash
openssl rand -base64 64
```

Then paste it into `JWT_SECRET` in `.env`.

Minimum production values:

```dotenv
DB_PASSWORD=CHANGE_ME_STRONG_DB_PASSWORD
POSTGRES_DB=tba_waad_system
POSTGRES_USER=postgres
TZ=Africa/Tripoli
PGTZ=Africa/Tripoli
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/tba_waad_system
SPRING_DATASOURCE_USERNAME=postgres
JWT_SECRET=CHANGE_ME_SUPER_LONG_RANDOM_SECRET_MIN_64_CHARS
APP_FRONTEND_URL=https://waadapp.ly
CORS_ALLOWED_ORIGINS=https://waadapp.ly,https://www.waadapp.ly
VITE_API_URL=/api/v1
FRONTEND_PORT=80
NGINX_CONFIG=nginx.local.conf
BUILD_NODE_OPTIONS=--max-old-space-size=4096
EMAIL_ENABLED=true
EMAIL_HOST=smtp.lsbox.email
EMAIL_PORT=587
EMAIL_USERNAME=info@waadapp.ly
EMAIL_PASSWORD=CHANGE_ME_MAILBOX_APP_PASSWORD
EMAIL_FROM=info@waadapp.ly
EMAIL_FROM_NAME=شركة وعد لإدارة النفقات الطبية
ADMIN_DEFAULT_PASSWORD=CHANGE_ME_STRONG_ADMIN_PASSWORD
```

## 2. First Deployment

Run from the repository root:

```powershell
docker compose --env-file .env up -d --build
docker compose ps
docker compose logs --tail=100 backend frontend
```

## 3. Rebuild After Code Changes

```powershell
docker compose --env-file .env down
docker compose --env-file .env build --no-cache frontend backend
docker compose --env-file .env up -d
docker compose ps
```

## 4. Important Notes

- The stack does not require an external Docker network.
- Fixed `container_name` values were removed, so this project can run beside other Compose projects on the same server.
- If port `80` is already occupied, change `FRONTEND_PORT` to another host port such as `8081`.
- `nginx.local.conf` is the correct default when TLS is terminated outside the container.
- Only switch to `nginx.conf` if you mount real certificate files inside the frontend container.
- `BUILD_NODE_OPTIONS=--max-old-space-size=4096` is kept specifically to reduce frontend build failures on smaller servers.
- For the new `waadapp.ly` mailbox, keep DNS records as configured for MX, SPF, DKIM, and DMARC, and use the mailbox login itself as both `EMAIL_USERNAME` and `EMAIL_FROM`.
- Recommended SMTP values for this setup are `EMAIL_HOST=smtp.lsbox.email` and `EMAIL_PORT=587` with STARTTLS.
- Existing databases will pick up the new mailbox defaults through Flyway migration `V20`, but `EMAIL_PASSWORD` still must be set manually on the server or saved from the admin email settings screen.

## 5. If Docker Itself Fails During Build

If you see errors such as Docker `500`, `EOF`, or daemon/API failures during image export, that is a Docker engine problem rather than a frontend code problem. Restart Docker on the server, then rerun:

```powershell
docker compose --env-file .env build frontend
docker compose --env-file .env up -d
```

## 6. If Frontend Shows Unhealthy On Server

If the server output shows names like `waadapp_frontend` or `waadapp_db_1` instead of the current Compose-managed names, the server is still running an older compose file or older clone.

Check the deployed files first:

```bash
git pull --ff-only origin main
grep -n "NGINX_CONFIG\|BUILD_NODE_OPTIONS\|FRONTEND_PORT" docker-compose.yml
grep -n "healthcheck" docker-compose.yml
```

Expected with the current repo:

- `frontend` has no healthcheck.
- `NGINX_CONFIG` defaults to `nginx.local.conf`.
- `BUILD_NODE_OPTIONS` is present.
- fixed `container_name` values are removed.

Then recreate the stack cleanly:

```bash
docker compose --env-file .env down --remove-orphans
docker compose --env-file .env build --no-cache frontend backend
docker compose --env-file .env up -d
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 frontend backend
```

If `frontend` still fails, check the two most likely causes:

1. `NGINX_CONFIG=nginx.conf` was used without mounting real SSL cert files.
	Fix: set `NGINX_CONFIG=nginx.local.conf` in `.env`.
2. The server is still using an old compose file with a frontend healthcheck or old container names.
	Fix: ensure `git pull` actually updated the repo, then run `docker compose down --remove-orphans` before `up -d`.