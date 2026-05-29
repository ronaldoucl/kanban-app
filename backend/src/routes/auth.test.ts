import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import authRoutes from './auth.routes';

// App de test que replica el montaje de index.ts (sin levantar el servidor).
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const prisma = new PrismaClient();

// Usuario semilla para los tests de login.
const existing = {
  username: 'loginuser',
  email: 'login@test.com',
  password: 'Password123!',
};

async function clean(): Promise<void> {
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await clean();
  const hash = await bcrypt.hash(existing.password, 10);
  await prisma.user.create({
    data: { username: existing.username, email: existing.email, password: hash },
  });
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('returns 201 with { data, error, message } when valid input', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'newuser',
      email: 'newuser@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 400 when username is less than 3 chars', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'ab',
      email: 'short@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'validname',
      email: 'not-an-email',
      password: 'Password123!',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'validname',
      email: 'nopass@test.com',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 (or 400) when email already exists', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'dupuser',
      email: existing.email,
      password: 'Password123!',
    });
    expect([409, 400]).toContain(res.status);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with a JWT token when credentials are correct', async () => {
    const res = await request(app).post('/auth/login').send({
      email: existing.email,
      password: existing.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(typeof res.body.data.token).toBe('string');
  });

  it('returns 401 when password is wrong', async () => {
    const res = await request(app).post('/auth/login').send({
      email: existing.email,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when email does not exist', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'ghost@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});
