# Módulo Financeiro V1 — Pacote 9
## Governança Financeira, Alçadas, Permissões e Segurança Operacional

### 1. Objetivo
Estabelecer a camada institucional de **Governança Financeira, Matriz de Alçadas, Perfis RBAC, Segregação de Funções (SoD) e Proteção de Operações Sensíveis** no backoffice **Financeiro Disk**, eliminando o modelo de usuário genérico com poderes irrestritos e garantindo conformidade, rastreabilidade e segurança patrimonial.

---

### 2. Princípio Arquitetural
A governança do sistema substitui o paradigma *"Financeiro Disk pode fazer tudo"* pela cadeia de controle e delegação de autoridade:

$$\text{Usuário Autenticado} \longrightarrow \text{Perfil (RBAC)} \longrightarrow \text{Permissões por Módulo} \longrightarrow \text{Faixa de Alçada} \longrightarrow \text{Validação de SoD} \longrightarrow \text{Operação Autorizada}$$

1. **Perfil (RBAC):** Determina as funções que o cargo está autorizado a exercer (ex.: Analista, Coordenador, Gerente, Diretor, Tesoureiro, Auditor/Controlador).
2. **Alçada:** Determina o teto monetário e o nível de risco que o usuário pode aprovar ou autorizar isoladamente.
3. **Segregação de Funções (SoD):** Impede que o mesmo usuário acumule papéis conflitantes no mesmo fluxo operacional.
4. **Operações Sensíveis:** Exigem requisitos especiais (dupla validação, justificativa obrigatória e registro imutável em auditoria).

---

### 3. Nova Estrutura da Área Administrativa
O antigo menu administrativo foi reestruturado para a nova área de primeira ordem:

```text
GOVERNANÇA FINANCEIRA
│
├── Visão Geral
├── Usuários Financeiros
├── Perfis e Permissões
├── Alçadas de Aprovação
├── Fluxos de Aprovação
├── Segregação de Funções
├── Operações Sensíveis
├── Bloqueios e Exceções
├── Auditoria de Acessos
└── Configurações
```

---

### 4. Segregação de Funções (SoD - Segregation of Duties)
A cadeia de custódia financeira exige que etapas operacionais sejam distribuídas entre agentes distintos:

$$\text{CRIADOR} \longrightarrow \text{ANALISADOR} \longrightarrow \text{APROVADOR} \longrightarrow \text{ASSINANTE} \longrightarrow \text{EXECUTOR DO PAGAMENTO} \longrightarrow \text{CONCILIADOR}$$

#### Regras Mandatórias de SoD:
- **Criador não aprova:** Quem cadastra ou solicita uma liberação/repasse não possui permissão para aprová-la.
- **Aprovador não assina pela Disk:** O responsável pela aprovação do repasse não assina como signatário final da Disk, exceto sob delegação formal de Diretoria.
- **Executor não concilia:** Quem executa pagamentos (disparo de PIX ou geração de remessa CNAB) é impedido de realizar a conciliação bancária da conta correspondente.
- **Operador de caixa não altera dados cadastrais:** O executor do pagamento não tem acesso à edição de dados bancários (contas e chaves PIX) dos produtores.

---

### 5. Matriz de Alçadas de Aprovação (Configurável)
Os limites são dinâmicos e configuráveis pela Diretoria / Administrador no sistema:

#### A. Repasses Operacionais
| Faixa de Alçada | Limite Monetário | Aprovador Mínimo |
| :--- | :--- | :--- |
| **Alçada A** | Até R$ 50.000,00 | Analista Sênior / Coordenador |
| **Alçada B** | De R$ 50.000,01 a R$ 250.000,00 | Gerente Financeiro |
| **Alçada C** | Acima de R$ 250.000,00 | Diretoria Financeira / CFO |

#### B. Antecipações de Recebíveis
| Faixa de Alçada | Limite Monetário | Exigências de Risco | Aprovador Mínimo |
| :--- | :--- | :--- | :--- |
| **Alçada A** | Até R$ 30.000,00 | Margem de retenção ≥ 30% | Coordenador de Crédito |
| **Alçada B** | De R$ 30.000,01 a R$ 150.000,00 | Histórico sem inadimplência | Gerente Financeiro |
| **Alçada C** | Acima de R$ 150.000,00 | Parecer formal de Comitê | Diretoria / CFO |

#### C. Pagamentos em Lote (PIX / CNAB)
- **Até R$ 100.000,00:** Operador de Tesouraria Nível 1.
- **De R$ 100.000,01 a R$ 500.000,00:** Aprovação conjunta (Tesouraria + Coordenador).
- **Acima de R$ 500.000,00:** Dupla chave obrigatória (Gerente Financeiro + Diretor).

#### D. Alteração de MDR e Regras Comerciais
- **Desvio de até 0,50% da tabela base:** Gerente Comercial/Financeiro com justificativa.
- **Desvio acima de 0,50% ou isenção de taxas:** Exclusivo Diretoria Financeira.

#### E. Ajustes Manuais no Ledger
- Qualquer ajuste manual exige parecer técnico da Controladoria e autorização do Gerente Financeiro.

---

### 6. Catálogo de Operações Sensíveis
Doze operações críticas possuem salvaguardas adicionais (solicitação de confirmação reforçada, justificativa e auditoria permanente):
1. **Alteração de dados bancários/PIX de Produtor:** Sujeita a quarentena preventiva de 48 horas antes da primeira liquidação.
2. **Alteração de taxas de MDR das Adquirentes.**
3. **Alteração de taxa comercial aplicada a Produtor ou Cliente.**
4. **Aprovação de solicitação de antecipação.**
5. **Assinatura digital de termos pela Disk (Autentique).**
6. **Execução de pagamentos (PIX / Remessas CNAB).**
7. **Cancelamento de pagamento já autorizado.**
8. **Ajustes manuais no Ledger Financeiro.**
9. **Reabertura de borderôs ou fechamentos concluídos.**
10. **Resolução de divergência de conciliação com ajuste financeiro.**
11. **Alteração de credenciais e webhooks do Autentique.**
12. **Alteração de mapeamentos e autenticação do Conta Azul.**

---

### 7. Bloqueios e Exceções
- **Quarentena Preventiva:** Travamento temporário de saídas após alterações de chaves PIX ou indícios de disputa/chargeback anômalo.
- **Delegação Temporária:** Possibilidade de transferência temporária de alçada (férias/afastamento) com data e hora de expiração automática e registro no histórico.
- **Trilha de Auditoria:** Cada evento crítico registra autor, alçada utilizada, valor anterior, valor novo, IP e hash de integridade.
