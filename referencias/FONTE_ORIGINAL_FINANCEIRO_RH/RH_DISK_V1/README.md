# RH Disk V1 + Disk Ponto (Ecossistema Operacional Completo)
## Fases 1 a 10 — Recursos Humanos, Ponto Móvel, Folha, Staff de Eventos & People Analytics

O **RH Disk V1** é o ecossistema corporativo completo de Gestão de Pessoas, Ponto Eletrônico Móvel e Folha de Pagamento da **DiskIngressos**, 100% integrado ao aplicativo móvel **Disk Ponto** (Android APK) e ao **Módulo Financeiro V1** (ERP Disk Ingressos).

---

## 🏛️ Arquitetura do Monorepo

```
RH_DISK_V1/
├── apps/
│   ├── web/          # Painel Web RH Operacional (React 18 + TypeScript + Vite) - 19 Visões
│   ├── api/          # Backend Core RH REST API (Node.js + Express + Prisma Dual-Engine)
│   └── mobile/       # Aplicativo Android Disk Ponto (React Native + Expo SDK 51)
├── packages/
│   └── shared/       # DTOs, Enums e Tipos TypeScript compartilhados (Fases 1 a 10)
├── prisma/
│   ├── schema.prisma # Modelagem relacional PostgreSQL completa (20+ entidades)
│   └── seed.ts       # Semeador completo com colaboradores, jornadas, escalas, benefícios, folha, staff e eSocial
├── tests/
│   └── fluxo-operacional-rh.test.mjs # Suíte de 30 testes automatizados ponta a ponta (100% aprovada)
├── docker-compose.yml# Banco PostgreSQL 16 Alpine pronto para execução
└── .env.example      # Variáveis de ambiente configuradas
```

---

## 🧭 Visão Geral das 10 Fases Implementadas

| Fase | Título | Funcionalidades Principais |
|---|---|---|
| **Fase 1** | **Fundação do Monorepo** | Estrutura pnpm workspaces, pacotes compartilhados, REST API Express e boilerplate web/mobile |
| **Fase 2** | **Ponto Móvel & Geofencing** | Registro com coordenadas GPS, cálculo Haversine de raio métrico, detecção de Mock GPS e offline queue |
| **Fase 3** | **Ajustes & Conformidade MTE** | Solicitação e homologação de ajustes de ponto, motivos padronizados Portaria 671/2021 MTE |
| **Fase 4** | **Jornadas, Escalas & Fechamento** | Monitor de ponto em tempo real, banco de horas, espelho de ponto, fechamento mensal com bloqueio por pendências |
| **Fase 5** | **Férias, Atestados & Ausências** | Controle de períodos aquisitivos/concessivos, abono pecuniário (1/3), atestados com CRM/CID-10 e abono no espelho |
| **Fase 6** | **Admissão Digital & GED** | Workflow de admissão com checklist documental, repositório GED com hash SHA-256 e assinatura eletrônica com IP/timestamp |
| **Fase 7** | **Gestão de Benefícios** | VT com teto legal de 6%, VR proporcional aos dias úteis trabalhados, plano de saúde coparticipativo e pedidos mensais |
| **Fase 8** | **Folha de Pagamento & Tesouraria** | Motor de cálculo CLT (INSS progressivo, IRRF, HE 50%/100%), holerites digitais, geração de remessa PIX e CNAB 240 |
| **Fase 9** | **Staff de Eventos & Freelancers** | Gestão de staff avulso/freelancers, check-in na cerca da arena, aprovação de diárias via PIX e apropriação no DRE do Evento |
| **Fase 10** | **People Analytics & eSocial** | Métricas de turnover, absenteísmo, pré-validação e geração de XMLs do eSocial (S-1000, S-2200, S-1200, S-1210) e trilha LGPD |

---

## 🚀 Detalhamento das Entregas (Fases 5 a 10)

### 🌴 Fase 5: Férias, Atestados Médicos e Ausências Legais
1. **Férias CLT:**
   - Períodos aquisitivos e concessivos com alertas automáticos de vencimento em dobro.
   - Opção de abono pecuniário (venda de 1/3 das férias) e adiantamento de 13º salário.
   - Cálculo automático do valor bruto com acréscimo de 1/3 constitucional.
2. **Atestados Médicos:**
   - Registro de CRM, UF do médico e classificação internacional CID-10.
   - Tratamento automático de abono de faltas no espelho de ponto com indicação de afastamento previdenciário para períodos superiores a 15 dias.
3. **Ausências Legais (Art. 473 CLT):**
   - Casamento (Gala - 3 dias), Falecimento (Nojo - 2 dias), Doação de Sangue, Alistamento Eleitoral.

### 📄 Fase 6: Admissão Digital, Onboarding e GED com Assinatura Eletrônica
1. **Admissão Digital:**
   - Workflow guiado com status: `RASCUNHO` $\rightarrow$ `EM_PREENCHIMENTO` $\rightarrow$ `DOCUMENTOS_ENVIADOS` $\rightarrow$ `EM_ANALISE` $\rightarrow$ `APROVADO` $\rightarrow$ `CONCLUIDO`.
   - Conclusão da admissão gera automaticamente o cadastro ativo do `Colaborador` e cria a conta de acesso ao portal.
2. **GED Corporativo (Gestão Eletrônica de Documentos):**
   - Repositório centralizado com integridade garantida via hash criptográfico SHA-256 (`hashSha256`).
   - Assinatura eletrônica com coleta de IP, User-Agent e carimbo de data/hora (`assinadoEm`, `ipAssinatura`).

### 💳 Fase 7: Gestão Corporativa de Benefícios
1. **Vale Transporte (VT):**
   - Cálculo automatizado com aplicação do teto de desconto de 6% do salário base estipulado pela Lei nº 7.418/1985.
2. **Vale Refeição / Alimentação (VR/VA):**
   - Valor diário multiplicado pelos dias úteis efetivamente trabalhados na competência, deduzindo férias e atestados integrais.
3. **Plano de Saúde e Odontológico:**
   - Desconto fixo da mensalidade corporativa e integração para coparticipação de consultas/exames.
4. **Pedidos Mensais de Recarga:**
   - Agrupamento mensal dos pedidos de benefícios com transição para `APROVADO` e envio dos totais para desconto em folha.

### 💰 Fase 8: Motor de Folha de Pagamento & Integração com Tesouraria Disk
1. **Motor de Cálculo Trabalhista CLT:**
   - Apuração de proventos: Salário Base, Horas Extras a 50% e 100%, DSR sobre horas extras, Gratificações.
   - Tabela progressiva do INSS (alíquotas de 7,5% a 14% com faixas de dedução) e tabela de IRRF com dependentes legais.
   - Apuração do FGTS patronal (8%) sem desconto do colaborador.
2. **Holerites Digitais:**
   - Disponibilização individual com detalhamento de proventos, descontos, bases de cálculo e salário líquido.
3. **Integração Atômica com a Tesouraria Disk:**
   - Geração de lotes de pagamento com envio para a Fila PIX da Tesouraria e layout CNAB 240 (Banco Itaú/Bradesco).

### 🎪 Fase 9: Staff de Eventos e Freelancers (Operação de Shows e Arenas)
1. **Gestão de Freelancers e Diaristas:**
   - Alocação rápida por função operacional (*Orientador de Público*, *Bilheteria*, *Bar/Caixa*, *Segurança*, *Coordenador*).
2. **Check-in por Geofence na Arena:**
   - Validação por cerca virtual nos locais dos eventos (*Ligga Arena*, *Pedreira Paulo Leminski*, *Teatro Positivo*).
3. **Liquidação Financeira via PIX & Apropriação no DRE do Evento:**
   - Homologação de diárias com envio instantâneo para pagamento PIX.
   - Vinculação direta do centro de custo ao código do Evento, lançando custos de equipe diretamente na linha de despesas operacionais do DRE gerencial.

### 📊 Fase 10: People Analytics, eSocial e Auditoria LGPD
1. **Painel de People Analytics:**
   - Taxa de rotatividade de colaboradores (Turnover mensal e anual).
   - Índice de absenteísmo (horas de faltas / horas planejadas).
   - Custo per capita com folha, encargos e benefícios corporativos.
2. **Pré-validação e Geração de Eventos eSocial:**
   - **S-1000:** Informações do Empregador / Empresa.
   - **S-2200:** Admissão de Trabalhador.
   - **S-1200:** Remuneração de Trabalhador vinculada à Folha.
   - **S-1210:** Pagamentos de Rendimentos do Trabalho.
   - Motor de pré-validação com retorno de inconsistências (CPF inválido, PIS ausente, etc.) antes da transmissão.
3. **Auditoria Avançada LGPD:**
   - Rastreabilidade de acessos a dados sensíveis (dados médicos de atestados, remunerações, endereços e documentos).

---

## 📱 Geração do APK Android (Disk Ponto)

O app está configurado com `package: com.diskingressos.ponto` no `apps/mobile/app.json`.

### Pré-requisitos:
- Node.js 18+ instalado
- EAS CLI instalado globalmente: `npm install -g eas-cli`

### Passo a Passo para Gerar o APK:
1. Acesse o diretório do app móvel:
   ```bash
   cd apps/mobile
   npm install
   ```
2. Inicie o build para gerar o arquivo `.apk` diretamente para Android:
   ```bash
   npm run build:apk
   # ou: eas build -p android --profile preview
   ```
3. Para gerar o pacote `.aab` da Google Play Store:
   ```bash
   npm run build:aab
   ```

---

## 🖥️ Execução Local dos Módulos

### 1. Iniciar Banco PostgreSQL (Opcional - a API conta com engine resiliente em memória):
```bash
docker compose up -d
npm run prisma:migrate
npm run seed
```

### 2. Backend REST API:
```bash
npm run dev:api
# Servidor rodando na porta 3333
```

### 3. Painel Web RH:
```bash
npm run dev:web
# Painel acessível em: http://localhost:5173
```

---

## 🧪 Testes Automatizados

### Testes da Suíte Completa do RH Disk V1 (Fases 1 a 10):
```bash
node RH_DISK_V1/tests/fluxo-operacional-rh.test.mjs
```
Resultado: **30/30 testes aprovados (100%)**.

### Suíte Geral Integrada (Módulo Financeiro + RH Disk):
```bash
npm test
```
Resultado: **112/112 testes aprovados (100%)**.

---

## 🔒 Segurança e Conformidade
- **Portaria 671/2021 MTE:** Emissão de espelho de ponto sem manipulação manual e registro inviolável de auditoria.
- **LGPD:** Criptografia de documentos (SHA-256), termos de consentimento e restrição de acesso a dados médicos/financeiros.
- **Segregação de Funções (SoD):** Bloqueio estrito de fechamento de ponto com inconsistências ou pendências não homologadas.
