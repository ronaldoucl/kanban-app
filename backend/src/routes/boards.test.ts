import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import boardsRoutes from './boards.routes';

const app = express();
app.use(express.json());
app.use('/boards', boardsRoutes);

const prisma = new PrismaClient();

function sign(payload: { id: string; email: string; username: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

async function clean(): Promise<void> {
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
}

let token: string;
let otherBoardId: string;

beforeAll(async () => {
  await clean();

  const user = await prisma.user.create({
    data: { username: 'boarduser', email: 'board@test.com', password: 'x' },
  });
  token = sign({ id: user.id, email: user.email, username: user.username });

  // Segundo usuario con su propio tablero (para el caso de borrado ajeno).
  const other = await prisma.user.create({
    data: { username: 'otheruser', email: 'other@test.com', password: 'x' },
  });
  const otherBoard = await prisma.board.create({
    data: { title: 'Tablero ajeno', ownerId: other.id },
  });
  otherBoardId = otherBoard.id;
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe('GET /boards', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/boards');
    expect(res.status).toBe(401);
  });

  it('returns 200 with an array when valid token is provided', async () => {
    const res = await request(app).get('/boards').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /boards', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/boards').send({ title: 'Nuevo' });
    expect(res.status).toBe(401);
  });

  it('returns 201 with new board when valid token + name provided', async () => {
    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Mi tablero' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Mi tablero');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /boards/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete(`/boards/${otherBoardId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 or 404 when board belongs to another user', async () => {
    const res = await request(app)
      .delete(`/boards/${otherBoardId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([403, 404]).toContain(res.status);
  });
});
