# TaskFlow Database

## Setup Instructions

### Prerequisites
- MySQL 8.x installed and running
- MySQL Workbench (optional, for GUI)

### 1. Create the Database Schema

```bash
mysql -u root -p < schema.sql
```

Or via MySQL Workbench: open `schema.sql` and execute.

### 2. Load Sample Data

```bash
mysql -u root -p < seed.sql
```

For an existing TaskFlow database, update `backend/.env` and run `npm run db:setup` from the `backend` directory. This applies the project membership and invitation tables and fills in usernames for older accounts.

### 3. Default Seed Users

| Name           | Email                  | Password       | Role   |
|----------------|------------------------|----------------|--------|
| Alice Johnson  | alice@taskflow.dev     | Password123!   | admin  |
| Bob Smith      | bob@taskflow.dev       | Password123!   | member |
| Carol Williams | carol@taskflow.dev     | Password123!   | member |
| David Lee      | david@taskflow.dev     | Password123!   | member |

> **Note**: The seed file contains bcrypt-hashed passwords. Use the credentials above when logging in via the app. You must **register** through the app to create real bcrypt hashes that match, OR you can register new accounts directly.

## Schema Overview

### Part 1 Tables
- **users** — Authentication, roles, profiles
- **projects** — Project records with status lifecycle
- **project_members** — User access and roles for each project
- **project_invitations** — In-app project invitations with pending, accepted, and declined states
- **tasks** — Task items linked to projects and users

### Entity Relationships
```
users 1──* projects        (created_by)
users *──* projects        (project_members)
users 1──* tasks           (created_by, assigned_to)
projects 1──* tasks        (project_id)
```

### Enums
- Project status: `PLANNING`, `ACTIVE`, `COMPLETED`, `ON_HOLD`
- Task priority: `LOW`, `MEDIUM`, `HIGH`
- Task status: `TODO`, `IN_PROGRESS`, `COMPLETED`
- User role: `admin`, `member`
