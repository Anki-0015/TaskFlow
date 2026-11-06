# TaskFlow

TaskFlow is a project and task management workspace built with Next.js, Express, and MySQL. It includes project teams and roles, tasks, project group chat, and password reset by one-time code.

## Quick start with Docker

Requirements: Docker Desktop or Docker Engine with Compose.

1. Copy `docker.env.example` to `.env` in this directory.
2. Set the database/JWT secrets and Gmail settings below.
3. Run `docker compose up --build -d` and open [http://localhost:3000](http://localhost:3000).

```env
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
PASSWORD_RESET_SECRET=your-long-random-secret
```

Create a Google App Password from your Google Account after enabling 2-Step Verification. Use it instead of your normal Google password. Generate `PASSWORD_RESET_SECRET` with `openssl rand -hex 32`. Keep `.env` private.

## Local development

Start MySQL, copy `backend/.env.example` to `backend/.env`, and set its database and Gmail values. From `backend/`, run `npm ci`, `npm run db:setup`, then `npm run dev`. In another terminal, from `frontend/`, run `npm ci` then `npm run dev`. Open [http://localhost:3000](http://localhost:3000).

Without Gmail settings, local development prints reset codes in the backend terminal. Fresh Docker databases initialize automatically; for an existing Docker database, apply `database/schema.sql` once with `docker compose exec -T database sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < database/schema.sql`.
