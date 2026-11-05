// Gera o token de sessão e o formato público do usuário (sem o hash da senha).
import jwt from 'jsonwebtoken';
import type { Database } from './db.js';
import type { AuthUser } from './middleware/auth.js';
import type { Role } from './validation.js';

export function createSession(db: Database, jwtSecret: string, userId: number) {
  const user = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id AS organizationId, u.client_id AS clientId,
              o.name AS organizationName
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ?`,
    )
    .get(userId) as AuthUser & { organizationName: string };

  const token = jwt.sign({ sub: String(user.id), role: user.role as Role, org: user.organizationId }, jwtSecret, {
    expiresIn: '7d',
  });
  return { token, user };
}
