import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cardsRoutes from './cards.routes';

// NOTA: el enunciado menciona "PUT /cards/:id/position", pero la ruta real
// definida en cards.routes.ts es "PUT /cards/:id". Se testea la ruta real.
const app = express();
app.use(express.json());
app.use('/cards', cardsRoutes);

const prisma = new PrismaClient();

function sign(payload: { id: string; email: string; username: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

async function clean(): Promise<void> {
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
}

let token: string;
let columnId: string;

beforeAll(async () => {
  await clean();

  const user = await prisma.user.create({
    data: { username: 'carduser', email: 'card@test.com', password: 'x' },
  });
  token = sign({ id: user.id, email: user.email, username: user.username });

  const board = await prisma.board.create({
    data: {
      title: 'Tablero cards',
      ownerId: user.id,
      columns: { create: [{ title: 'Por hacer', order: 0 }] },
    },
    include: { columns: true },
  });
  columnId = board.columns[0].id;
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe('POST /cards', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/cards').send({ title: 'Tarea', columnId });
    expect(res.status).toBe(401);
  });

  it('returns 201 when valid token + columnId + title provided', async () => {
    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Tarea', columnId });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });
});

describe('PUT /cards/:id', () => {
  it('returns 401 without token', async () => {
    const card = await prisma.card.create({ data: { title: 'C1', order: 0, columnId } });
    const res = await request(app).put(`/cards/${card.id}`).send({ position: 0 });
    expect(res.status).toBe(401);
  });

  it('returns 200 when position is updated with valid data', async () => {
    const card = await prisma.card.create({ data: { title: 'C2', order: 1, columnId } });
    const res = await request(app)
      .put(`/cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ columnId, position: 0 });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /cards/:id', () => {
  it('returns 401 without token', async () => {
    const card = await prisma.card.create({ data: { title: 'C3', order: 2, columnId } });
    const res = await request(app).delete(`/cards/${card.id}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 when card is deleted by its owner', async () => {
    const card = await prisma.card.create({ data: { title: 'C4', order: 3, columnId } });
    const res = await request(app)
      .delete(`/cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
