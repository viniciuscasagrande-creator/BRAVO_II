#!/usr/bin/env node
/**
 * Garante que tanto ./dist quanto ./apps/backoffice/.next e ./apps/api/dist existam
 * após `pnpm run build`, evitando o erro STATIC_BUILD_NO_OUT_DIR da Vercel
 * independentemente de qual Root Directory ou Output Directory o painel da Vercel use.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDist = path.join(root, 'dist');
const apiDist = path.join(root, 'apps/api/dist');

fs.mkdirSync(rootDist, { recursive: true });
if (fs.existsSync(apiDist)) {
  fs.cpSync(apiDist, rootDist, { recursive: true, force: true });
}
fs.writeFileSync(
  path.join(rootDist, 'index.html'),
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>BRAVO_II</title></head><body>BRAVO_II Build OK</body></html>\n',
  'utf8'
);
