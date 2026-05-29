import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createCard(req: Request, res: Response): Promise<void> {
  try {
    const { title, columnId } = req.body as { title: string; columnId: string };

    const column = await prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!column) {
      res.status(404).json({ data: null, error: 'Columna no encontrada', message: null });
      return;
    }

    const lastCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
    });
    const order = lastCard ? lastCard.order + 1 : 0;

    // El número de tarea es secuencial por tablero (estilo KAN-1, KAN-2, ...).
    // Usamos un contador en Board para que sea único, persistente y no se
    // reutilice aunque se eliminen cards.
    const card = await prisma.$transaction(async (tx) => {
      const board = await tx.board.update({
        where: { id: column.boardId },
        data: { cardSeq: { increment: 1 } },
        select: { cardSeq: true },
      });
      return tx.card.create({
        data: { title, columnId, order, number: board.cardSeq },
      });
    });

    res.status(201).json({ data: card, error: null, message: 'Card creada exitosamente' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function updateCard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, columnId, position } = req.body as {
      title?: string;
      description?: string;
      columnId?: string;
      position?: number;
    };

    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ data: null, error: 'Card no encontrada', message: null });
      return;
    }

    const movingColumn = columnId !== undefined && columnId !== existing.columnId;
    const movingOrder = position !== undefined;

    if (!movingColumn && !movingOrder) {
      const card = await prisma.card.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        },
      });
      res.json({ data: card, error: null, message: null });
      return;
    }

    const targetColumnId = columnId ?? existing.columnId;
    const targetOrder = position ?? existing.order;

    await prisma.$transaction(async (tx) => {
      if (movingColumn) {
        // Cerrar hueco en columna origen
        await tx.card.updateMany({
          where: { columnId: existing.columnId, order: { gt: existing.order } },
          data: { order: { decrement: 1 } },
        });

        // Abrir espacio en columna destino
        await tx.card.updateMany({
          where: { columnId: targetColumnId, id: { not: id }, order: { gte: targetOrder } },
          data: { order: { increment: 1 } },
        });
      } else if (targetOrder > existing.order) {
        // Reordenar dentro de la misma columna (mover hacia abajo):
        // las cards entre la posición vieja y la nueva suben una posición
        await tx.card.updateMany({
          where: {
            columnId: targetColumnId,
            id: { not: id },
            order: { gt: existing.order, lte: targetOrder },
          },
          data: { order: { decrement: 1 } },
        });
      } else if (targetOrder < existing.order) {
        // Reordenar dentro de la misma columna (mover hacia arriba):
        // las cards entre la posición nueva y la vieja bajan una posición
        await tx.card.updateMany({
          where: {
            columnId: targetColumnId,
            id: { not: id },
            order: { gte: targetOrder, lt: existing.order },
          },
          data: { order: { increment: 1 } },
        });
      }

      await tx.card.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          columnId: targetColumnId,
          order: targetOrder,
        },
      });
    });

    const card = await prisma.card.findUnique({ where: { id } });
    res.json({ data: card, error: null, message: null });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ data: null, error: 'Card no encontrada', message: null });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.card.delete({ where: { id } });
      await tx.card.updateMany({
        where: { columnId: existing.columnId, order: { gt: existing.order } },
        data: { order: { decrement: 1 } },
      });
    });

    res.json({ data: null, error: null, message: 'Card eliminada exitosamente' });
  } catch {
    res.status(500).json({ data: null, error: 'Error interno del servidor', message: null });
  }
}
