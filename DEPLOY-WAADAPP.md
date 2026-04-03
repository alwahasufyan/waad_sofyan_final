# Deploy To waadapp.ly

## 1. Environment File

Use [.env.waadapp.example](.env.waadapp.example) as the server `.env` base.

Minimum production values:

```dotenv
DB_PASSWORD=WAAD@359228
POSTGRES_DB=tba_waad_system
POSTGRES_USER=postgres
TZ=Africa/Tripoli
PGTZ=Africa/Tripoli
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/tba_waad_system
SPRING_DATASOURCE_USERNAME=postgres
JWT_SECRET=waad_super_secret_key_2026_prod_2026_secure
APP_FRONTEND_URL=https://waadapp.ly
CORS_ALLOWED_ORIGINS=https://waadapp.ly,https://www.waadapp.ly
VITE_API_URL=/api/v1
FRONTEND_PORT=80
NGINX_CONFIG=nginx.local.conf
BUILD_NODE_OPTIONS=--max-old-space-size=4096
EMAIL_ENABLED=false
EMAIL_USERNAME=info@alwahacare.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=info@alwahacare.com
EMAIL_FROM_NAME=WaadCare
ADMIN_DEFAULT_PASSWORD=Admin@123
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

## 5. If Docker Itself Fails During Build

If you see errors such as Docker `500`, `EOF`, or daemon/API failures during image export, that is a Docker engine problem rather than a frontend code problem. Restart Docker on the server, then rerun:

```powershell
docker compose --env-file .env build frontend
docker compose --env-file .env up -d
```