# Hostinger VPS Deployment

1. SSH into the VPS.
2. Install Docker and the Docker Compose plugin.
3. Point your domain DNS A record to the VPS IP.
4. Clone this repository.
5. Copy the environment file:

```bash
cp .env.example .env
```

6. Fill in secrets, including `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, and `APP_SECRET_ENCRYPTION_KEY`.
7. Update `Caddyfile` with your real domain.
8. Start the stack:

```bash
docker compose up -d --build
```

9. Run migrations:

```bash
docker compose exec app npx prisma migrate deploy
```

10. Create the first admin user:

```bash
docker compose exec app npm run create-admin
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment before running the command if you do not want the defaults.

11. Visit the configured app domain.

## Storage

Uploaded files and generated images are mounted at:

```txt
./storage:/app/storage
```

Back up this folder along with PostgreSQL data.
