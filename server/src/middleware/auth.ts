// Middlewares de acesso:
// - requireAuth: só deixa passar quem envia um token JWT válido (`Authorization: Bearer <token>`)
//   de um usuário que continua ativo.
// - requireRole: além de logado, exige um dos papéis informados.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Database } from '../db.js';
import type { Role } from '../validation.js';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  organizationId: number;
  clientId: number | null;
};

// Acrescenta `user` ao tipo Request do Express.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(db: Database, jwtSecret: string) {
  const findUser = db.prepare(
    `SELECT id, name, email, role, organization_id AS organizationId, client_id AS clientId
     FROM users WHERE id = ? AND active = 1`,
  );

  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado.' });
    }

    let userId: number;
    try {
      const payload = jwt.verify(header.slice('Bearer '.length), jwtSecret) as { sub: string };
      userId = Number(payload.sub);
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // Relemos o usuário do banco a cada requisição (TDD §5.6): assim, quem for desativado
    // ou mudar de papel perde o acesso na hora, mesmo com um token ainda válido.
    const user = findUser.get(userId) as AuthUser | undefined;
    if (!user) return res.status(401).json({ error: 'Usuário inativo ou inexistente.' });

    req.user = user;
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}
