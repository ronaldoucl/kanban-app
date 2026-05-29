import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { register, login } from '../controllers/auth.controller';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
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

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
