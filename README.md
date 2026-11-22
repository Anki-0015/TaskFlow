# TaskFlow

Project and task management workspace built with Next.js, Express, TypeScript, and MySQL.

## Features

- **Dashboard** — personal focus list with one-click start/complete, upcoming deadlines, overdue alerts, a 14-day completion chart, task status breakdown, project progress and recent activity.
- **Projects** — roles (manager, member, viewer), invitations, group chat, and a Kanban board with filters, sorting, due-date highlighting and drag-and-drop.
- **Tasks** — list and board views across all projects with search and filters.
- **Accounts** — cookie-based sessions, profile editing, and email password reset.
- **Administration** — admin-only workspace totals, searchable account directory, and member/admin role management with session revocation and last-admin protection.

## Local development

Start MySQL, copy `backend/.env.example` to `backend/.env`, and configure its database and secrets. The backend example includes a local-only admin login: `admin@taskflow.local` / `TaskFlow-Local-Admin-2026!` (username `admin`). Replace it for any deployed instance; production setup rejects these local defaults. The bootstrap password is only used when the account is first created, so change it through the account password flow afterward. From `backend/`, run `npm ci` and `npm run dev`; in another terminal, from `frontend/`, run `npm ci` and `npm run dev`. Open [http://localhost:3000](http://localhost:3000).

Password reset codes print in the backend terminal when Gmail is not configured in development. Keep both `.env` files private.
