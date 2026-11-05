// Monta a aplicação Express. Fica separado do server.ts para que os testes
// consigam criar a API com um banco em memória, sem abrir uma porta de rede.
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { join } from 'node:path';
import type { Database } from './db.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { inviteRoutes } from './routes/invites.js';
import { userRoutes } from './routes/users.js';
import { clientRoutes } from './routes/clients.js';
import { projectRoutes } from './routes/projects.js';
import { categoryRoutes } from './routes/categories.js';

// webDir: pasta com o frontend já compilado (web/dist). Quando informada, a própria API
// também entrega o site, e assim basta hospedar um único serviço em produção.
export function createApp(db: Database, jwtSecret: string, webDir?: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const auth = requireAuth(db, jwtSecret);
  const managerOnly = requireRole('MANAGER');

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes(db, jwtSecret));
  app.use('/api/invites', inviteRoutes(db, jwtSecret));
  app.use('/api/users', auth, managerOnly, userRoutes(db));
  app.use('/api/clients', auth, managerOnly, clientRoutes(db));
  app.use('/api/projects', auth, projectRoutes(db));
  app.use('/api/categories', auth, categoryRoutes(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

  if (webDir) {
    app.use(express.static(webDir));
    // Rotas do React (/login, /cadastro...) não são arquivos: devolvemos o index.html
    // e o React Router decide qual tela mostrar.
    app.get('/{*path}', (_req, res) => res.sendFile(join(webDir, 'index.html')));
  }

  // Qualquer erro inesperado cai aqui, em vez de derrubar o servidor.
  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}
