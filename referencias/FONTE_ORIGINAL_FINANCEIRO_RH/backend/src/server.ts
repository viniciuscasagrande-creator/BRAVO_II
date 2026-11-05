import { app } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[Disk Financeiro Backend] Servidor API Node.js rodando na porta ${PORT}`);
  console.log(`[Segurança] RBAC e Multi-Tenant Protection Ativos`);
  console.log(`[Workflow] Regra de Assinatura Sequencial Rigorosa Ativa`);
});
