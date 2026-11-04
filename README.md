# TaskFlow

TaskFlow is a project and task management app built with Next.js, Express, and MySQL.

## Run with Docker

Requirements: Docker Engine or Docker Desktop with the Compose plugin.

```bash
cp docker.env.example .env
docker compose up --build -d
```

Open the app at [http://localhost:3000](http://localhost:3000). The API health endpoint is [http://localhost:5001/health](http://localhost:5001/health).

Compose starts MySQL, creates the schema, loads the sample data, and waits for the database and API health checks before starting dependent services. MySQL data persists in a named volume. The initialization SQL runs only when that volume is first created.

To stop the services while keeping the database:

```bash
docker compose down
```

To remove the database and start again with a fresh schema and seed data:

```bash
docker compose down -v
docker compose up --build -d
```

The `.env` file controls the database credentials, JWT secret, frontend API URL, and host ports. Change the sample JWT secret before deploying. `NEXT_PUBLIC_API_URL` is embedded in the frontend at build time, so rebuild the frontend after changing it:

```bash
docker compose build frontend
docker compose up -d
```
