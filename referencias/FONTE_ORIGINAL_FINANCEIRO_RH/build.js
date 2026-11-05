import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copia o arquivo principal index.html
fs.copyFileSync('index.html', path.join(distDir, 'index.html'));

// Copia os diretórios estáticos
const dirs = ['css', 'js', 'img'];
for (const d of dirs) {
  if (fs.existsSync(d)) {
    fs.cpSync(d, path.join(distDir, d), { recursive: true });
  }
}

const vercelStatic = path.resolve('.vercel', 'output', 'static');
if (fs.existsSync(path.resolve('.vercel', 'output'))) {
  fs.cpSync(distDir, vercelStatic, { recursive: true });
}

console.log('✓ Build estático concluído com sucesso para o Vercel: pasta dist/ criada.');

