import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.middleware';
import { createCard, updateCard, deleteCard } from '../controllers/cards.controller';

const router = Router();

const createCardSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  columnId: z.string().min(1, 'El columnId es requerido'),
});

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  columnId: z.string().optional(),
  position: z.number().int().min(0).optional(),
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

router.post('/', validate(createCardSchema), createCard);
router.put('/:id', validate(updateCardSchema), updateCard);
router.delete('/:id', deleteCard);

export default router;
