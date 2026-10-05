# TaskFlow

TaskFlow is a simple project and task management app.

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** MySQL

## Setup

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Update the database credentials and JWT secret in `backend/.env`.

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### 3. Set up the database

Make sure MySQL is running, then run:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## Run the app

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```
