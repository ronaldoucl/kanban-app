import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const renameBoardSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
});

const DEFAULT_COLUMNS = ['Por hacer', 'En progreso', 'Hecho'];

export async function getBoards(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const boards = await prisma.board.findMany({
      where: { ownerId: userId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    res.json({ data: boards, error: null, message: null });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function createBoard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title } = req.body as { title: string };

    const board = await prisma.board.create({
      data: {
        title,
        ownerId: userId,
        columns: {
          create: DEFAULT_COLUMNS.map((colTitle, index) => ({
            title: colTitle,
            order: index,
          })),
        },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: { cards: true },
        },
      },
    });

    res.status(201).json({ data: board, error: null, message: 'Board creado exitosamente' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function deleteBoard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    await prisma.board.delete({ where: { id } });
    res.json({ data: null, error: null, message: 'Board eliminado exitosamente' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function renameBoard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = renameBoardSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ data: null, error: message, message: null });
      return;
    }

    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: { title: result.data.title },
    });

    res.json({ data: updatedBoard, error: null, message: 'Board renamed' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}
