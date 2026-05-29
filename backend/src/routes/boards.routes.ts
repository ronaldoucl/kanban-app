import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware';
import {
  getBoards,
  getBoardById,
  createBoard,
  deleteBoard,
  renameBoard,
  createColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
} from '../controllers/boards.controller';

const router = Router();

const createBoardSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
});

function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      res.status(400).json({ data: null, error: message, message: null });
      return;
    }
    next();
  };
}

router.use(authGuard);

router.get('/', getBoards);
router.get('/:id', getBoardById);
router.post('/', validate(createBoardSchema), createBoard);
router.patch('/:id', renameBoard);
router.delete('/:id', deleteBoard);

// Columnas. `reorder` debe declararse antes de `/columns/:id` para que no sea
// capturado como un id.
router.post('/:boardId/columns', createColumn);
router.patch('/:boardId/columns/reorder', reorderColumns);
router.patch('/:boardId/columns/:id', renameColumn);
router.delete('/:boardId/columns/:id', deleteColumn);

export default router;
