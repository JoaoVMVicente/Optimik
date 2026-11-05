// Ponto de entrada: abre o banco e coloca a API para escutar na porta configurada.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createDatabase } from './db.js';
import { createApp } from './app.js';

// Em produção, a API também entrega o site compilado (gerado por `npm run build` na pasta web).
const webDir = fileURLToPath(new URL('../../web/dist', import.meta.url));
const serveWeb = config.isProduction && existsSync(webDir);

const db = createDatabase(config.databasePath);
const app = createApp(db, config.jwtSecret, serveWeb ? webDir : undefined);

app.listen(config.port, () => {
  console.log(`🚀 API do Optimik rodando em http://localhost:${config.port}`);
  if (serveWeb) console.log('🌐 Servindo também o site (web/dist)');
});
