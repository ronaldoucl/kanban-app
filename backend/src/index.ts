import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import boardsRoutes from './routes/boards.routes';
import cardsRoutes from './routes/cards.routes';
import { initBoardSocket } from './socket/board.socket';
import { logger } from './utils/logger';

const allowedOrigins = [
  'https://kanban-app-seven-rouge.vercel.app',
  'http://localhost:4200'
];

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/boards', boardsRoutes);
app.use('/cards', cardsRoutes);

app.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' }, error: null, message: null });
});

initBoardSocket(io);

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  logger.info(`Servidor corriendo en http://localhost:${PORT}`);
});

export { io };
