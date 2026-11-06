#!/usr/bin/env node
/**
 * Prepara o diretório ./dist na raiz após `pnpm run build` para compatibilidade total
 * com projetos na Vercel configurados com Framework Preset = Vite (Output Directory: dist),
 * exportando os assets (_next/static) e as páginas HTML pré-renderizadas do Backoffice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDist = path.join(root, 'dist');
const nextDir = path.join(root, 'apps/backoffice/.next');
const nextStaticDir = path.join(nextDir, 'static');
const nextServerAppDir = path.join(nextDir, 'server/app');

fs.rmSync(rootDist, { recursive: true, force: true });
fs.mkdirSync(rootDist, { recursive: true });

// 1. Copia os assets estáticos do Next.js para dist/_next/static
if (fs.existsSync(nextStaticDir)) {
  const destStatic = path.join(rootDist, '_next/static');
  fs.mkdirSync(destStatic, { recursive: true });
  fs.cpSync(nextStaticDir, destStatic, { recursive: true, force: true });
}

// 2. Copia recursivamente as páginas HTML e payloads RSC de .next/server/app para dist/
//    removendo segmentos de route-group como (erp) para que /sac, /pedidos, /estornos funcionem direto
function copyAppPages(srcDir, relParts = []) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullSrc = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
      const nextRel = isRouteGroup ? relParts : [...relParts, entry.name];
      copyAppPages(fullSrc, nextRel);
    } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.rsc'))) {
      const targetSubdir = path.join(rootDist, ...relParts);
      fs.mkdirSync(targetSubdir, { recursive: true });
      const destFile = path.join(targetSubdir, entry.name);
      fs.copyFileSync(fullSrc, destFile);

      // Se for <rota>.html (ex: financeiro.html), também cria <rota>/index.html para suporte a rotas sem .html
      if (entry.name.endsWith('.html') && entry.name !== 'index.html' && entry.name !== '_not-found.html') {
        const routeBase = entry.name.slice(0, -'.html'.length);
        const folderIndexDir = path.join(targetSubdir, routeBase);
        fs.mkdirSync(folderIndexDir, { recursive: true });
        fs.copyFileSync(fullSrc, path.join(folderIndexDir, 'index.html'));
      }
      if (entry.name === '_not-found.html' && relParts.length === 0) {
        fs.copyFileSync(fullSrc, path.join(rootDist, '404.html'));
      }
    }
  }
}

copyAppPages(nextServerAppDir);

// Fallback caso index.html ainda não exista
const rootIndex = path.join(rootDist, 'index.html');
if (!fs.existsSync(rootIndex)) {
  fs.writeFileSync(
    rootIndex,
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>BRAVO_II</title></head><body>BRAVO_II</body></html>\n',
    'utf8'
  );
}
