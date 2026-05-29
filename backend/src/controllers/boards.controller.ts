import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const renameBoardSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
});

// La API de columnas acepta `name` en el body (según especificación), pero el
// modelo Prisma persiste el valor en el campo `title`.
const columnNameSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
});

const reorderColumnsSchema = z.object({
  columns: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int(),
      }),
    )
    .min(1, 'Se requiere al menos una columna'),
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

export async function getBoardById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }

    // El parámetro puede ser el cuid completo (URLs viejas) o solo su sufijo
    // (URLs nuevas con id corto); `endsWith` cubre ambos casos. El filtro por
    // ownerId acota la búsqueda a los pocos tableros del usuario.
    const board = await prisma.board.findFirst({
      where: { ownerId: userId, id: { endsWith: id } },
      include: {
        columns: {
          orderBy: { createdAt: 'asc' },
          include: {
            cards: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }

    res.json({ data: board, error: null, message: null });
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

export async function createColumn(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { boardId } = req.params;

    const result = columnNameSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ data: null, error: message, message: null });
      return;
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    const order = await prisma.column.count({ where: { boardId } });
    const column = await prisma.column.create({
      data: { title: result.data.name, order, boardId },
    });

    res.status(201).json({ data: column, error: null, message: 'Column created' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function renameColumn(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { boardId, id } = req.params;

    const result = columnNameSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ data: null, error: message, message: null });
      return;
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    const column = await prisma.column.update({
      where: { id },
      data: { title: result.data.name },
    });

    res.json({ data: column, error: null, message: 'Column renamed' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function deleteColumn(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { boardId, id } = req.params;

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    // El schema de Prisma elimina en cascada las cards asociadas (onDelete: Cascade).
    await prisma.column.delete({ where: { id } });

    res.json({ data: null, error: null, message: 'Column deleted' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function reorderColumns(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { boardId } = req.params;

    const result = reorderColumnsSchema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ data: null, error: message, message: null });
      return;
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res.status(404).json({ data: null, error: 'Board no encontrado', message: null });
      return;
    }
    if (board.ownerId !== userId) {
      res.status(403).json({ data: null, error: 'No autorizado', message: null });
      return;
    }

    await prisma.$transaction(
      result.data.columns.map((column) =>
        prisma.column.update({
          where: { id: column.id },
          data: { order: column.order },
        }),
      ),
    );

    res.json({ data: null, error: null, message: 'Columns reordered' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}
