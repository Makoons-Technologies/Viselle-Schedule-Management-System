# Viselle Schedule Management System

Admin and staff console for the Viselle scheduling platform. Connects to the **Scheduler Backend API** for all business logic.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn-style UI (Radix + CVA)
- TanStack Query
- React Hook Form + Zod
- React Router

## Setup

1. Ensure the backend API is running at `http://localhost:3001` (see Beauty Backend API repo).

2. Install and configure:

```bash
npm install
cp .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

Open **http://localhost:5173**

## Demo login

| Role | Email | Password |
|------|-------|----------|
| Platform owner | `owner@test.com` | `password123` |

After login as platform owner, select **Demo Spa** in the top bar to manage the seeded organization.

## Routes

| Role | Home |
|------|------|
| Platform owner | `/platform/dashboard` |
| Org owner | `/orgs/:orgId/dashboard` |
| Staff | `/staff/schedule` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Architecture

```
Viselle Console (this repo)
        ↓ REST / JSON
Scheduler Backend API
        ↓
Supabase PostgreSQL
```

No business logic lives in this frontend — all data flows through the API.
