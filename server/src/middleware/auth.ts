// Middleware que protege as rotas: só deixa passar quem envia um token JWT válido
// no cabeçalho `Authorization: Bearer <token>`.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Acrescenta `userId` ao tipo Request do Express.
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado.' });
    }

    try {
      const payload = jwt.verify(header.slice('Bearer '.length), jwtSecret) as { sub: string };
      req.userId = Number(payload.sub);
      next();
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
  };
}
