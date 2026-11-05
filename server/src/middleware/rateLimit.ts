// Limite de tentativas (TDD §5.6): dificulta quem tenta adivinhar senhas na força bruta.
// Guarda as contagens na memória do processo, o que basta para um único servidor.
import type { NextFunction, Request, Response } from 'express';

export function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'desconhecido';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });
    }
    next();
  };
}
