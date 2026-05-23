import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());

app.use('/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' }, error: null, message: null });
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export { io };
