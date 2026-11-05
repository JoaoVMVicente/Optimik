// Projetos (US03). O gestor cria e aloca devs; cada papel vê só o que lhe cabe (TDD §5.2):
// - Gestor: todos os projetos da organização
// - Desenvolvedor: projetos em que está alocado (valor da hora só se o gestor liberar)
// - Cliente: projetos do próprio cliente
import { Router } from 'express';
import { z } from 'zod';
import { transaction, type Database } from '../db.js';
import { requireRole, type AuthUser } from '../middleware/auth.js';
import { firstError, id, money, name, paramId, toCents, toReais } from '../validation.js';

const projectSchema = z.object({
  clientId: id,
  name: name(100),
  hourlyRate: money,
  budgetHours: z.number().int('Horas previstas devem ser um número inteiro.').positive('Horas previstas devem ser maiores que zero.').nullable().optional(),
  showValuesToDevs: z.boolean().optional().default(false),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
});

const membersSchema = z.object({ userIds: z.array(id) });

type ProjectRow = {
  id: number;
  clientId: number;
  clientName: string;
  name: string;
  hourlyRateCents: number;
  budgetHours: number | null;
  showValuesToDevs: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
};

const SELECT_PROJECT = `
  SELECT p.id, p.client_id AS clientId, c.name AS clientName, p.name, p.hourly_rate_cents AS hourlyRateCents,
         p.budget_hours AS budgetHours, p.show_values_to_devs AS showValuesToDevs, p.status, p.created_at AS createdAt
  FROM projects p JOIN clients c ON c.id = p.client_id`;

export function projectRoutes(db: Database) {
  const router = Router();

  const membersOf = db.prepare(
    `SELECT u.id, u.name FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ? ORDER BY u.name`,
  );

  function serialize(row: ProjectRow, viewer: AuthUser) {
    const { hourlyRateCents, ...rest } = row;
    const canSeeValues = viewer.role !== 'DEVELOPER' || row.showValuesToDevs === 1;
    return {
      ...rest,
      showValuesToDevs: row.showValuesToDevs === 1,
      hourlyRate: canSeeValues ? toReais(hourlyRateCents) : null,
      // A lista de membros só interessa ao gestor.
      ...(viewer.role === 'MANAGER' ? { members: membersOf.all(row.id) } : {}),
    };
  }

  // Busca um projeto da organização do gestor (ou undefined).
  const findOwned = (projectId: number, orgId: number) =>
    db.prepare(`${SELECT_PROJECT} WHERE p.id = ? AND p.organization_id = ?`).get(projectId, orgId) as ProjectRow | undefined;

  const clientExists = (clientId: number, orgId: number) =>
    Boolean(db.prepare('SELECT 1 FROM clients WHERE id = ? AND organization_id = ?').get(clientId, orgId));

  router.get('/', (req, res) => {
    const user = req.user!;
    let rows: ProjectRow[];

    if (user.role === 'MANAGER') {
      rows = db.prepare(`${SELECT_PROJECT} WHERE p.organization_id = ? ORDER BY p.status, p.name`).all(user.organizationId) as ProjectRow[];
    } else if (user.role === 'DEVELOPER') {
      rows = db
        .prepare(`${SELECT_PROJECT} JOIN project_members pm ON pm.project_id = p.id WHERE pm.user_id = ? ORDER BY p.status, p.name`)
        .all(user.id) as ProjectRow[];
    } else {
      rows = db.prepare(`${SELECT_PROJECT} WHERE p.client_id = ? ORDER BY p.status, p.name`).all(user.clientId!) as ProjectRow[];
    }

    res.json(rows.map((row) => serialize(row, user)));
  });

  router.post('/', requireRole('MANAGER'), (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;
    const orgId = req.user!.organizationId;

    if (!clientExists(data.clientId, orgId)) return res.status(400).json({ error: 'Cliente não encontrado.' });

    const result = db
      .prepare(
        `INSERT INTO projects (organization_id, client_id, name, hourly_rate_cents, budget_hours, show_values_to_devs, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(orgId, data.clientId, data.name, toCents(data.hourlyRate), data.budgetHours ?? null, data.showValuesToDevs ? 1 : 0, data.status);

    res.status(201).json(serialize(findOwned(Number(result.lastInsertRowid), orgId)!, req.user!));
  });

  router.put('/:id', requireRole('MANAGER'), (req, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const data = parsed.data;
    const orgId = req.user!.organizationId;
    const projectId = paramId(req.params.id);

    if (!findOwned(projectId, orgId)) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (!clientExists(data.clientId, orgId)) return res.status(400).json({ error: 'Cliente não encontrado.' });

    db.prepare(
      `UPDATE projects SET client_id = ?, name = ?, hourly_rate_cents = ?, budget_hours = ?, show_values_to_devs = ?, status = ?
       WHERE id = ? AND organization_id = ?`,
    ).run(data.clientId, data.name, toCents(data.hourlyRate), data.budgetHours ?? null, data.showValuesToDevs ? 1 : 0, data.status, projectId, orgId);

    res.json(serialize(findOwned(projectId, orgId)!, req.user!));
  });

  // Define quem está alocado no projeto (substitui a lista inteira).
  router.put('/:id/members', requireRole('MANAGER'), (req, res) => {
    const parsed = membersSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
    const orgId = req.user!.organizationId;
    const projectId = paramId(req.params.id);

    if (!findOwned(projectId, orgId)) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const userIds = [...new Set(parsed.data.userIds)];
    const canWork = db.prepare(
      `SELECT 1 FROM users WHERE id = ? AND organization_id = ? AND active = 1 AND role IN ('MANAGER', 'DEVELOPER')`,
    );
    if (userIds.some((userId) => !canWork.get(userId, orgId))) {
      return res.status(400).json({ error: 'Só desenvolvedores e gestores ativos da organização podem ser alocados.' });
    }

    transaction(db, () => {
      db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
      const insert = db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)');
      for (const userId of userIds) insert.run(projectId, userId);
    });

    res.json(serialize(findOwned(projectId, orgId)!, req.user!));
  });

  return router;
}
