# TaskFlow

Project and task management workspace built with Next.js, Express, TypeScript, and MySQL. Includes project roles, task status permissions, invitations, group chat, and email password reset.

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
