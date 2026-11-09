# MASTER_SPEC.md — Especificação Mestre e Protocolo de Governança do BRAVO_II (v1.0)

## 1. Identidade do Produto
- **Nome Oficial:** `BRAVO_II`
- **Organização:** DiskIngressos
- **Missão:** Core ERP corporativo modular, independente e auditável da operação DiskIngressos (sucessor do SIGE, construído 100% do zero sobre base própria, sem dependência de código-fonte legado).
- **Idioma de Interface:** Português do Brasil (`pt-BR`) em 100% das telas, mensagens, alertas e relatórios.

---

## 2. Invariantes Inegociáveis de Negócio e Segurança
1. **Taxa Disk por Evento:** A Taxa Disk é negociada exclusivamente por **EVENTO** (`PERCENTUAL` em basis points ou `FIXA` em centavos), versionada e aprovada por dupla alçada. É proibido aplicar taxa global única por produtor.
2. **Sigilo Comercial no PDT:** A Taxa Disk contratual interna **jamais** pode ser exposta em APIs, DTOs, logs ou telas do Portal do Produtor (`PDT`).
3. **Ingresso de 8 Dígitos + QR Independente:** Todo ingresso emitido possui código numérico visível de exatamente 8 dígitos e assinatura criptográfica QR independente para validação de portaria.
4. **Inventário Transacional Único:** Venda online, checkout e PDV consomem o mesmo inventário atômico por sessão/lote/setor (`SERIALIZABLE` / atualização atômica).
5. **Segregação Contábil Tripla:** Recebimento bruto total pela Disk, receita da Taxa Disk por evento e obrigação líquida devida ao produtor são contabilmente distintos no livro razão (`fin_ledger_entries`).
6. **Segregação SAC × Financeiro em Estornos:** O SAC registra e analisa a solicitação; somente o Financeiro Disk aprova (com dupla alçada quando aplicável); e a liquidação externa permanece bloqueada em homologação (`ENABLE_REAL_REFUNDS=false`).
7. **Fluxo de Repasse e Antecipação:** Exige solicitação, validação de elegibilidade, aprovação financeira, assinatura do produtor e assinatura final do Financeiro Disk.
8. **Isolamento Multi-Produtor (RBAC + ABAC):** O perfil `PRODUTOR` visualiza exclusivamente eventos e borderôs aos quais está vinculado. Perfis internos possuem escopos segregados por departamento.
9. **Preservação Integral da Matriz 149:** As 104 funções do Financeiro Disk e as 45 funções de RH & DP (`reference/matriz-149-original.csv` e `reference/catalogo-149-original.json`) são preservadas byte a byte com verificação SHA-256.
10. **Bloqueio Fail-Closed em Homologação/Preview:** `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`. Nenhum pagamento, estorno bancário, repasse real ou publicação externa no site público é executado em homologação.

---

## 3. Protocolo Mestre de Desenvolvimento (Regra Permanente para IA no VS Code)

### 3.1 Regras Principais
- **NÃO** reconstruir o projeto sem autorização.
- **NÃO** mudar a arquitetura por iniciativa própria.
- **NÃO** criar módulos ou tabelas duplicadas.
- **NÃO** remover funcionalidades existentes.
- **NÃO** substituir componentes sem justificativa técnica aprovada.
- **NÃO** alterar o Design System sem autorização.
- **NÃO** declarar funcionalidades catalogadas como homologadas/operacionais sem evidência técnica (tela + endpoint + serviço + banco + RBAC + testes).

### 3.2 Fluxo de Trabalho Obrigatório em 7 Etapas
1. **Leitura:** Inspecionar `docs/governance/*`, `GEMINI.md` e os arquivos reais envolvidos.
2. **Diagnóstico:** Identificar a causa raiz sem modificar arquivos.
3. **Planejamento:** Declarar diagnóstico, objetivo, arquivos envolvidos, estratégia, riscos e critérios de aceite.
4. **Autorização:** Executar apenas o escopo aprovado pelo responsável do projeto.
5. **Implementação:** Reutilizar contratos, serviços e Design System existentes.
6. **Validação:** Executar `typecheck`, `build`, `vercel-preflight`, validação de schema Prisma e suítes de testes automatizados.
7. **Documentação:** Atualizar obrigatoriamente `docs/governance/IMPLEMENTATION_STATUS.md` e `docs/governance/CHANGELOG_DEV.md`.
