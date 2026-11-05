# Módulo de Repasses — Homologação PDT Novo (V0.2)

Módulo independente de repasses, políticas financeiras, autorizações excepcionais e workflow de aprovação/liquidação desenvolvido para incorporação ao ecossistema do **PDT Novo** (`pdtnovo.diskingressos.com.br`) da **Disk Ingressos**.

---

## 1. Regras Canônicas de Negócio

### 1.1 Gatilho de Liberação
- O evento deve atingir no mínimo **50% da sua meta/base de vendas**.
- Abaixo desse percentual, o produtor visualiza o progresso e o saldo, mas o botão de solicitação permanece **travado**.
- O sistema calcula e exibe em tempo real: `faltamVendas = (Meta × 50%) - Vendas Realizadas`.

### 1.2 Limite Bruto Liberado
- Ao atingir os 50%, libera-se inicialmente **20% do valor correspondente às vendas realizadas**.
- Exemplo:
  - Meta: R$ 1.000.000,00
  - Vendas Realizadas: R$ 520.000,00 (52% — gatilho atingido)
  - Limite Bruto Liberado: $20\% \times \text{R\$ } 520.000,00 = \text{R\$ } 104.000,00$.

### 1.3 Deduções e Fórmula Canônica
$$\text{Disponível para Solicitar} = (\text{Vendas Realizadas} \times \%_{\text{liberado}}) - \text{Repasses Anteriores} - \text{Valores Bloqueados/Reservados}$$
- Se o evento do exemplo já realizou R$ 40.000,00 em repasses e possui R$ 10.000,00 retidos/bloqueados:
  $$\text{Disponível} = \text{R\$ } 104.000,00 - \text{R\$ } 40.000,00 - \text{R\$ } 10.000,00 = \text{R\$ } 54.000,00$$

### 1.4 Parametrização Flexível (Sem Hardcode)
- Os percentuais de **50% (gatilho)** e **20% (liberação)** são parâmetros dinâmicos mantidos pelo Financeiro Disk.
- Resolução hierárquica em 3 níveis de precedência:
  $$\text{Geral Disk} \longrightarrow \text{Por Produtor} \longrightarrow \text{Por Evento}$$

### 1.5 A Trava Humana (Autorizações Excepcionais)
- O Financeiro Disk possui canal exclusivo para liberar repasses fora da regra padrão (ex: evento abaixo de 50% que necessita de adiantamento para montagem de palco).
- Exige **justificativa formal obrigatória com no mínimo 5 caracteres**.
- Gera protocolo auditável (`AUT-2026-XXXXX`), status `ATIVA`, consumo atômico na solicitação e registro em trilha de auditoria imutável.

### 1.6 Segregação de Funções (SoD) e Ordem de Assinatura
- **Quem solicita ou aprovou não pode liquidar o repasse**.
- **Ordem estrita de assinatura**: o Produtor DEVE assinar antes da Disk Ingressos. Tentativas de assinatura da Disk sem a assinatura prévia do Produtor são rejeitadas com erro 422.

---

## 2. Contratos da API REST (Backend Express)

Porta padrão: `http://localhost:3333`

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/repasses/politica` | Consulta política global vigente. |
| `PUT` | `/api/repasses/politica` | Atualiza parâmetros globais (gatilho %, liberação %, flags de governança). |
| `GET` | `/api/repasses/eventos` | Lista eventos com cálculo de elegibilidade em tempo real. |
| `GET` | `/api/repasses/elegibilidade/:eventoId` | Retorna cálculo canônico detalhado para o evento informado. |
| `POST` | `/api/repasses/solicitacoes` | Cria solicitação de repasse com validação de elegibilidade e deduções. |
| `GET` | `/api/repasses/solicitacoes` | Lista esteira de solicitações de repasse. |
| `GET` | `/api/repasses/solicitacoes/:id` | Detalhes de uma solicitação específica. |
| `POST` | `/api/repasses/solicitacoes/:id/aprovar` | Aprovação pela mesa financeira Disk (SoD: aprovador ≠ solicitante). |
| `POST` | `/api/repasses/solicitacoes/:id/reprovar` | Reprovação com justificativa obrigatória. |
| `POST` | `/api/repasses/solicitacoes/:id/assinar` | Assinatura digital (Produtor assina primeiro; Disk assina após o Produtor). |
| `POST` | `/api/repasses/solicitacoes/:id/liquidar` | Liquidação bancária/PIX na Tesouraria (SoD: executor ≠ aprovador). |
| `GET` | `/api/repasses/autorizacoes` | Lista autorizações excepcionais cadastradas. |
| `POST` | `/api/repasses/autorizacoes` | Emissão de autorização excepcional (motivo $\ge 5$ caracteres obrigatório). |
| `POST` | `/api/repasses/autorizacoes/:id/cancelar` | Revogação/cancelamento de autorização ativa. |
| `GET` | `/api/repasses/auditoria` | Trilha de auditoria imutável dos eventos do sistema. |
| `POST` | `/api/repasses/reset` | Reseta a base de dados de homologação para o estado inicial. |

---

## 3. Instruções de Execução

### Instalação
```bash
cd modules/modulo-repasses-homologacao
npm run install:all
```

### Inicialização Concorrente (Front + Back)
```bash
npm run dev
```

- **Frontend Vite / React**: `http://localhost:5173`
- **Backend API Express**: `http://localhost:3333`

---

## 4. Roteiro de Teste e Homologação (PDT Novo)

1. **Cenário 1 — Evento Apto (52% de vendas):**
   - Selecionar `EVT-001 (Festival de Homologação 2026)`.
   - Verificar barra de progresso verde acima do marcador vermelho (50%).
   - Verificar cálculo das 4 caixas: Vendas R$ 520.000, Limite Bruto R$ 104.000, Deduções R$ 50.000, Disponível R$ 54.000.
   - Clicar em `Solicitar Repasse` e submeter R$ 54.000.

2. **Cenário 2 — Evento Travado (30% de vendas):**
   - Selecionar `EVT-002 (Show de Outono Curitiba)`.
   - O botão `Solicitar Repasse` está bloqueado.
   - O alerta vermelho indica: "Faltam R$ 160.000,00 em vendas para liberar o primeiro repasse".

3. **Cenário 3 — A Trava Humana (Autorização Excepcional):**
   - No perfil `Financeiro Disk`, abrir a aba `Autorizações`.
   - Criar autorização de R$ 35.000,00 para `EVT-002` com justificativa: "Adiantamento pré-produção aprovado".
   - Voltar à `Visão Geral`: o evento agora exibe `EXCEÇÃO AUTORIZADA PELA MESA DISK` e libera a solicitação de R$ 35.000,00.

4. **Cenário 4 — Esteira de Governança Ponta a Ponta:**
   - Na aba `Solicitações`:
     - Financeiro Disk clica em `Aprovar`.
     - Produtor clica em `Assinar Produtor`.
     - Financeiro Disk clica em `Assinar Disk`.
     - Tesouraria clica em `Liquidar PIX`.
   - Verificar comprovante gerado e atualização na `Trilha de Auditoria`.
