// Lê as variáveis de ambiente (arquivo .env) em um único lugar.
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

// Em produção, recusamos subir com o segredo padrão: qualquer um conseguiria forjar tokens.
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('Defina a variável de ambiente JWT_SECRET antes de iniciar em produção.');
}

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3333),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-troque-em-producao',
  databasePath: process.env.DATABASE_PATH ?? './data/optimik.db',
};
