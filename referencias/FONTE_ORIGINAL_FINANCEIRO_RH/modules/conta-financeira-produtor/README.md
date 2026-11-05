# Financeiro Disk — Conta Financeira Interna V0.5 (Funcional)

Módulo contábil e financeiro unificado desenvolvido para a **Disk Ingressos**, estruturado em torno da **Conta Financeira de Controle Interno Vinculada ao CNPJ do Produtor** e preparado para homologação e posterior incorporação ao **PDT Novo** (`pdtnovo.diskingressos.com.br`).

---

## 1. Acesso & Isolamento Arquitetural Estrito

Todo o núcleo desta aplicação é de **uso exclusivo do perfil FINANCEIRO_DISK**.
O Produtor não visualiza reservas internas, retenções, agenda de obrigações, concessão de crédito, critérios internos de risco, fila administrativa de estornos ou ledger interno — ele enxerga exclusivamente seus números operacionais líquidos auditados.

---

## 2. Domínios Consolidados na V0.5 Funcional

A V0.5 consolida os 6 domínios totalmente operacionais, com formulários, modais e ações em tempo real:

1. **Conta Interna (Saldos & Elegibilidade por Evento)**:
   - Consolidação por CNPJ nos 5 pilares canônicos de saldo.
   - Detalhamento por evento com aplicação da regra canônica:
     $$\text{Disponível} = (\text{Vendas} \times 20\%) - \text{Repasses Anteriores} - \text{Retenções/Reservas} - \text{Estornos} - \text{Amortizações}$$
   - **Visualizar Toda a Movimentação do Evento (Drilldown)**: Modal completo que reúne resumo da fórmula de repasse, obrigações específicas, estornos do pedido, contratos de crédito e extrato exclusivo do ledger daquele evento.
   - Solicitação de repasse com validação automática contra o limite elegível.

2. **Reservas e Retenções**:
   - Operações para criar retenções cautelares ou bloqueios operacionais com favorecido, valor, motivo e ator.
   - Ação de **Liberar Saldo**, exigindo motivo formal e gerando lançamento de `LIBERACAO` no Ledger.

3. **Agenda de Obrigações do Evento**:
   - Programação de obrigações com vencimento previsto e opção de **reservar o valor imediatamente** (`reserveNow`).
   - Categorias: `ALUGUEL_ESPACO`, `ECAD`, `FORNECEDOR`, `OPERACIONAL`, `IMPOSTOS` e `OUTROS`.
   - Transições de status: `PREVISTO` $\to$ `RESERVADO` $\to$ `RETIDO` $\to$ `LIQUIDADO`.
   - Ação de **Liquidar Pagamento**: Registra baixa contábil definitiva e liberação no Ledger.

4. **Créditos e Antecipações ao Produtor**:
   - Concessão de crédito com valor principal, taxa de juros (% a.m.), quantidade de parcelas e modelo de amortização (`PARCELAS_FIXAS`, `PERCENTUAL_RECEBIVEIS`, `FECHAMENTO_EVENTO`).
   - **Amortização Automática sobre Receitas** (`POST /api/interno/receitas`): Ao registrar vendas ou novas receitas no evento, os créditos ativos vinculados ao modelo `PERCENTUAL_RECEBIVEIS` abatem dívida automaticamente e lançam `AMORTIZACAO_CREDITO` no Ledger.
   - Ação manual de **Amortizar** para quitação antecipada ou parcelada.

5. **Fila de Estornos com Reserva Imediata, Dupla Autorização Estrita (SoD) e Rejeição**:
   - Ao iniciar um estorno, o valor é **imediatamente retido** (`RESERVA_ESTORNO`), deduzindo da base de repasse.
   - **Segregação de Funções Obrigatória (SoD)**: O mesmo usuário NÃO pode conceder a 1ª e a 2ª autorização.
   - **Rejeição com Liberação da Reserva** (`POST /api/interno/estornos/:id/rejeitar`): Libera o valor retido de volta ao disponível através de lançamento contábil `LIBERACAO`.
   - **Efetivação**: Rigorosamente bloqueada até que existam duas autorizações distintas com registro de reautenticação/MFA.

6. **Extrato Imutável do Ledger**:
   - Livro-razão contábil onde o saldo nunca é editado diretamente. Cada intervenção gera lançamento no ledger com motivo, usuário responsável e data/hora.
   - Invariante rigorosa:
     $$\text{Saldo Anterior} + \text{Créditos} - \text{Débitos} = \text{Saldo Atual}$$
   - Filtros operacionais por Evento e por Tipo de Lançamento.

---

## 3. Como Executar

```bash
cd modules/conta-financeira-produtor
npm run install:all
npm run dev
```

- **Backend API**: `http://localhost:3333`
- **Frontend Vite**: `http://localhost:5173`

---

## 4. Integração com o PDT Novo

O arquivo `backend/src/adapters/pdtNovoAdapter.js` permanece como fronteira oficial para plugar os dados reais de produtores, eventos, bilheteria, gateways e autenticação JWT/MFA do PDT Novo durante a homologação.

## Evolução V0.6 — Contratos de Crédito
- Crédito/antecipação passa a possuir contrato e cronograma de parcelas.
- Suporte a primeira data de vencimento e referência contratual.
- Cada parcela possui valor previsto, valor pago, situação e data de quitação.
- Amortizações manuais e automáticas por recebíveis são apropriadas ao cronograma.
- Identificação de parcelas pendentes, parciais, vencidas e parcialmente vencidas.
- Endpoint de posição detalhada: `GET /api/interno/creditos/:id`.
- Mantida a regra de acesso exclusivo `FINANCEIRO_DISK`.
