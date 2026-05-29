import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

function signToken(id: string, email: string, username: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return jwt.sign({ id, email, username }, secret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body as { username: string; email: string; password: string };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ data: null, error: 'El email ya está registrado', message: null });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    const token = signToken(user.id, user.email, user.username);
    res.status(201).json({ data: { token }, error: null, message: 'Usuario registrado exitosamente' });
  } catch (err) {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ data: null, error: 'Credenciales inválidas', message: null });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ data: null, error: 'Credenciales inválidas', message: null });
      return;
    }

    const token = signToken(user.id, user.email, user.username);
    res.status(200).json({ data: { token }, error: null, message: 'Login exitoso' });
  } catch (err) {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}
