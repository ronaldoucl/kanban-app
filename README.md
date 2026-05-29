# Taskr

> Personal portfolio project — a full-stack Kanban board application
> with real-time collaboration built from scratch.

🔗 **Live demo**: https://kanban-app-seven-rouge.vercel.app

---

## Overview

**Taskr** is a full-stack Kanban board application that lets users organize work into boards, columns and cards with a fast, drag-and-drop interface — in the spirit of tools like Trello or Jira, but built end to end from scratch. A user signs up, creates a board (which is seeded with three default columns: *Por hacer*, *En progreso*, *Hecho*), and then manages tasks by dragging cards between columns, reordering them, renaming or reordering columns, and editing card details. Each card receives a sequential, board-scoped identifier (`KAN-1`, `KAN-2`, …) so tasks stay referenceable even after others are deleted.

The problem it solves is coordination on a shared board: changes need to propagate to everyone looking at the same board without a manual refresh. Taskr handles this with a WebSocket layer (Socket.io) where each board is its own room — when one client moves a card, the update is broadcast only to the other clients viewing that board, keeping the UI in sync in real time while avoiding unnecessary traffic to unrelated clients.

This is a personal portfolio project developed by **RonaldoScript** to demonstrate full-stack engineering across a modern Angular frontend, a typed Express + Prisma backend, real-time messaging, JWT authentication, an integration test suite, and a production deployment spread across three managed services (Supabase, Render and Vercel).

---

## Features

- **JWT authentication** — register and login with hashed passwords (bcrypt), 7-day signed tokens, route guards on the frontend and `authGuard` middleware protecting every board/card endpoint on the backend.
- **Board management** — create, rename and delete boards; each new board is automatically seeded with three default columns.
- **Column management** — add, rename, delete and reorder columns; deleting a column cascades to its cards.
- **Card management** — create cards, edit title and description, move cards across columns, reorder within a column, and delete cards.
- **Drag & drop** — powered by Angular CDK (`DragDropModule`), with connected drop lists across all columns of a board.
- **Real-time sync** — card moves are broadcast over Socket.io to all other clients in the same board room (`board:<id>`); a local echo-guard prevents re-applying a client's own move.
- **Sequential task numbers** — board-scoped counter (`cardSeq`) gives each card a stable `KAN-{number}` identifier that is never reused.
- **Responsive layout** — horizontal Kanban view on desktop and a vertical list view on mobile, synced to a single CSS breakpoint (767px).
- **Short, shareable board URLs** — board detail routes resolve from either a full CUID (legacy URLs) or a short id suffix.
- **Input validation** — request bodies validated with Zod schemas; consistent `{ data, error, message }` API response shape.
- **Toast notifications** — lightweight client-side feedback service for user actions.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular 20 (Standalone Components) | SPA framework; lazy-loaded routes, signals for state |
| Angular CDK (`@angular/cdk`) | Drag & drop for cards and columns |
| Angular Router | Client-side routing with `canActivate` auth guard |
| RxJS | Reactive HTTP and Socket.io event streams |
| Socket.io-client | Real-time WebSocket connection to the board rooms |
| @tabler/icons | UI icon set |
| TypeScript (strict) | Type-safe application code |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 4 | REST API server |
| TypeScript (strict) | Type-safe server code |
| Prisma 5 | ORM and migration-based schema management |
| PostgreSQL | Relational database |
| Socket.io 4 | WebSocket server for real-time card updates |
| JSON Web Tokens (`jsonwebtoken`) | Stateless authentication (7-day tokens) |
| bcrypt | Password hashing (10 salt rounds) |
| Zod | Request body validation |
| Winston | Structured logging (no `console.log` in production) |
| Jest + Supertest | Integration testing |

### Infrastructure
| Service | Role |
|---|---|
| Supabase | PostgreSQL database (connection pooling via pgBouncer) |
| Render | Backend hosting (Docker, auto-deploy on push) |
| Vercel | Frontend hosting (Angular, SPA routing) |

---

## Architecture

Taskr is split into an Angular single-page app and a stateless Express backend that exposes both a REST API and a Socket.io WebSocket server from the same HTTP server. Authentication is JWT-based: the backend issues a signed token on register/login, the Angular `jwt.interceptor` attaches it to every request, and an `authGuard` middleware verifies it before any board or card route runs. Persistence goes through Prisma, with the schema versioned by migrations (`prisma migrate deploy`) applied automatically on each backend release. Real-time collaboration is implemented with Socket.io rooms — clients `join-board` to subscribe to a specific board, and a `card-moved` event is relayed only to the other members of that room, never broadcast globally. The frontend uses Angular standalone components with signals for local state and CDK for drag-and-drop interactions.

```
Browser → Vercel (Angular SPA)
             ↓ HTTP (REST API)
         Render (Express + Socket.io)
             ↓ Prisma ORM
         Supabase (PostgreSQL)
```

---

## Key Technical Decisions

- **Socket.io rooms instead of global broadcast.** Each board is its own room (`board:<id>`). A `card-moved` event is emitted with `socket.to(room)`, so only clients viewing that board receive the update — this scopes traffic per board and keeps unrelated sessions quiet.
- **Local echo-guard for real-time moves.** The board detail component tracks the id of the last card it moved locally so the round-trip socket event for its own move isn't re-applied, preventing flicker and duplicate state updates.
- **Prisma `$transaction` for reordering.** Card moves and column reorders mutate the `order` of multiple rows (closing the gap in the source column, opening space in the target, shifting siblings). These are wrapped in `prisma.$transaction` so the ordering stays consistent even mid-operation.
- **Board-scoped sequential card numbers via a counter.** Rather than counting existing cards (which would reuse numbers after deletions), each board holds a `cardSeq` counter incremented inside the same transaction that creates the card, guaranteeing unique, persistent `KAN-N` identifiers.
- **JWT in `localStorage` with client-side expiry check.** The Angular `AuthService` decodes the token payload and checks `exp` against the current time in `isAuthenticated()`, so the route guard can reject expired sessions without a network round-trip.
- **Standalone Angular components with lazy loading.** Every route uses `loadComponent` with dynamic imports, avoiding NgModules and code-splitting each feature for a smaller initial bundle.
- **Multi-stage Docker build.** A builder stage compiles TypeScript and generates the Prisma client; the final image installs only production dependencies, keeping the runtime image lean. The container runs `prisma migrate deploy` before starting the server.

---

## API Endpoints

All `/boards` and `/cards` routes are protected by the `authGuard` middleware (JWT required). Responses follow the `{ data, error, message }` shape.

### Auth
- `POST /auth/register` — create a user (username, email, password), returns a JWT
- `POST /auth/login` — authenticate by email + password, returns a JWT

### Boards
- `GET /boards` — list the authenticated user's boards (with columns and cards)
- `GET /boards/:id` — get a single board by full or short id (with ordered columns and cards)
- `POST /boards` — create a board (seeded with default columns)
- `PATCH /boards/:id` — rename a board
- `DELETE /boards/:id` — delete a board

### Columns (nested under boards)
- `POST /boards/:boardId/columns` — create a column
- `PATCH /boards/:boardId/columns/reorder` — reorder columns in bulk
- `PATCH /boards/:boardId/columns/:id` — rename a column
- `DELETE /boards/:boardId/columns/:id` — delete a column (cascades to its cards)

### Cards
- `POST /cards` — create a card in a column
- `PUT /cards/:id` — update a card (title, description, move column / reorder position)
- `DELETE /cards/:id` — delete a card (and close the ordering gap)

### Health
- `GET /health` — liveness probe used by Render

---

## Database Schema

The data model has four entities managed by Prisma against PostgreSQL:

- **User** — `id` (cuid), unique `username`, unique `email`, hashed `password`, timestamps. A user owns many boards.
- **Board** — `id`, `title`, a `cardSeq` counter (for sequential card numbering), timestamps, and an `ownerId` pointing to its `User`. A board has many columns.
- **Column** — `id`, `title`, an integer `order`, timestamps, and a `boardId`. A column has many cards. Deleting a board cascades to its columns (`onDelete: Cascade`).
- **Card** — `id`, `title`, optional `description`, an integer `order` (position within its column), a `number` (the board-scoped `KAN-N` value), timestamps, and a `columnId`. Deleting a column cascades to its cards (`onDelete: Cascade`).

**Key constraints:** `User.username` and `User.email` are unique; cascade deletes flow Board → Column → Card; `order` fields drive both card position within a column and column position within a board; `cardSeq` on Board guarantees non-reused, monotonic card numbers.

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL
- npm

### Local setup

```bash
# Clone the repo
git clone https://github.com/ronaldoucl/kanban-app.git
cd kanban-app

# Backend
cd backend
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npm install
npx prisma migrate deploy
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run start
```

The backend runs on `http://localhost:3000` and the Angular dev server on `http://localhost:4200`.

---

## Testing

```bash
cd backend
npm test
```

**21 tests across 3 suites** (auth, boards, cards), built with **Jest + Supertest** and run serially (`--runInBand`) against a **real PostgreSQL test database**. There are **no mocks** — these are full integration tests that exercise the HTTP layer, authentication, validation and database writes end to end.

---

## Deployment

Taskr runs across three managed services:

- **Supabase** — managed PostgreSQL. The app uses two connection strings: `DATABASE_URL` through the pgBouncer pooler (port 6543) for the application, and `DIRECT_URL` over a direct connection (port 5432) for running migrations.
- **Render** — the backend deploys from a multi-stage `Dockerfile` (`runtime: docker`), with `prisma migrate deploy` run on each release before the server starts, and `/health` configured as the health check path. `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET` are injected as secret environment variables.
- **Vercel** — the Angular frontend builds in production configuration and serves from `dist/kanban-frontend/browser`, with a rewrite rule (`/(.*) → /index.html`) so client-side SPA routing works on deep links.

---

## Author

Developed by **RonaldoScript**
GitHub: https://github.com/ronaldoucl
