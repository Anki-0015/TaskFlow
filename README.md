# TaskFlow

Project and task management workspace built with Next.js, Express, TypeScript, and MySQL.

## Features

- **Dashboard** — personal focus list with one-click start/complete, upcoming deadlines, overdue alerts, a 14-day completion chart, task status breakdown, project progress and recent activity.
- **Projects** — roles (manager, member, viewer), invitations, group chat, and a Kanban board with filters, sorting, due-date highlighting and drag-and-drop.
- **Tasks** — list and board views across all projects with search and filters.
- **Accounts** — cookie-based sessions, profile editing, and email password reset.
- **Light and dark themes**, responsive down to phone screens.

## Production notes

- The API sets security headers, disables caching of API responses, and rate-limits requests (300/min per IP, 20 sign-in/reset attempts per 15 min). Limits are in memory, so use a shared store if you run more than one API instance.
- Behind a reverse proxy or load balancer, set `TRUST_PROXY` to the number of proxies so client IPs are correct.
- `GET /health` is a liveness check; `GET /ready` also checks the database and is used by the Compose health check.
- Database sessions run in UTC. The backend container applies idempotent schema migrations (`scripts/setup-db.js`) on every start.
- The API shuts down gracefully on `SIGTERM`.

## Docker setup

Install Docker, copy `docker.env.example` to the project root as `.env`, and replace every `replace_with_...` value with a unique secret. Generate the JWT and reset secrets with `openssl rand -hex 32`. Set Gmail to a Google App Password. For deployment, set `FRONTEND_URL` to the exact frontend origin and `NEXT_PUBLIC_API_URL` to an API URL reachable by the visitor’s browser. Then run:

```sh
docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000). Compose reads the root `.env`; `backend/.env` is for local development.

For an existing Docker database volume, apply schema updates with `docker compose exec backend npm run db:setup`.

## Local development

Start MySQL, copy `backend/.env.example` to `backend/.env`, and configure its database and secrets. From `backend/`, run `npm ci` and `npm run dev`; development startup applies the schema setup before starting the API. In another terminal, from `frontend/`, run `npm ci` and `npm run dev`. Open [http://localhost:3000](http://localhost:3000).

Password reset codes print in the backend terminal when Gmail is not configured in development. Keep both `.env` files private.
