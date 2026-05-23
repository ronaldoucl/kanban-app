# CLAUDE.md — Kanban App

## Stack
- Frontend: Angular 17+ Standalone Components, Angular CDK, Socket.io-client
- Backend: Node.js + Express + TypeScript
- ORM: Prisma con PostgreSQL
- Auth: JWT (jsonwebtoken) + bcrypt
- Realtime: Socket.io
- Validación: Zod

## Estructura de carpetas
kanban-app/
  frontend/src/app/
    core/services/       → servicios globales (auth, board, socket)
    core/interceptors/   → jwt.interceptor.ts
    core/guards/         → auth.guard.ts
    features/auth/       → login, register components
    features/board/      → board, column, card components
  backend/src/
    routes/              → auth.routes.ts, boards.routes.ts, cards.routes.ts
    middleware/          → auth.middleware.ts
    controllers/         → lógica de negocio
    socket/              → board.socket.ts
    prisma/              → schema.prisma

## Convenciones
- TypeScript estricto, nunca usar `any`
- camelCase para variables y funciones
- PascalCase para clases, interfaces y componentes
- Todos los endpoints protegidos usan el middleware authGuard
- Respuestas de API siempre con forma: { data, error, message }

## Prohibiciones
- No instalar dependencias sin confirmar primero
- No crear archivos fuera de la estructura definida arriba
- No usar `console.log` en producción, usar un logger
- No hardcodear strings de conexión, todo va en .env