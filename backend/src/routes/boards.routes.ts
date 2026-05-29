import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware';
import { getBoards, createBoard, deleteBoard, renameBoard } from '../controllers/boards.controller';

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
router.post('/', validate(createBoardSchema), createBoard);
router.patch('/:id', renameBoard);
router.delete('/:id', deleteBoard);

export default router;
