# Documentação Técnica e Histórico de Pacotes — Módulo Financeiro V1

Este diretório centraliza todas as especificações técnicas, documentações de pacotes e registros de governança do **Módulo Financeiro V1 (Disk Ingressos)**.

---

## 📁 Estrutura de Diretórios da Documentação

```text
docs/
├── README.md               # Este índice central de documentação
├── screenshots/            # Telas de referência, mockups e capturas de layout
│   ├── final_layout_financeiro.png
│   ├── final_layout_produtor.png
│   └── screen.png
└── pacotes/                # Especificações detalhadas de cada entrega funcional
    ├── PACOTE_2_OPERACAO_FINANCEIRA_REAL.md
    ├── PACOTE_3_GATEWAYS_MDR_CONCILIACAO.md
    ├── PACOTE_4_TESOURARIA_BANCOS_PIX_CNAB_CAIXA.md
    ├── PACOTE_5_CONCILIACAO_FINANCEIRA_COMPLETA.md
    ├── PACOTE_6_FECHAMENTOS_BORDEROS_DOSSIE.md
    ├── PACOTE_7_CONTROLADORIA_RENTABILIDADE.md
    ├── PACOTE_8_ASSINATURAS_AUTENTIQUE_CONTA_AZUL.md
    ├── PACOTE_9_GOVERNANCA_ALCADAS_BOTOES_COMUNICACAO.md
    ├── PACOTE_9_GOVERNANCA_ALCADAS_SEGURANCA.md
    ├── PACOTE_10_CENTRAL_TRABALHO_ALERTAS_SLA.md
    ├── PACOTE_11_VARREDURA_FUNCIONAL_COMUNICACAO.md
    ├── PACOTE_12_FUNCIONALIZACAO_INTEGRAL.md
    ├── PACOTE_13_FUNCOES_FINANCEIRAS_AVANCADAS.md
    ├── PACOTE_14_CONSOLIDACAO_FUNCIONAL_PERSISTENCIA.md
    ├── PACOTE_15_CORRECOES_REGRESSAO.md
    ├── PACOTE_16_VISAO_GERAL_FUNCIONAL.md
│   ├── PACOTE_17_TAXAS_REGRAS_COMERCIAIS_FUNCIONAIS.md
│   ├── PACOTE_18_CENTRAL_GATEWAYS_ADQUIRENTES.md
│   ├── PACOTE_19_CONSOLIDACAO_TAXAS_TESOURARIA_CONCILIACAO.md
│   ├── PACOTE_20_CONSOLIDACAO_AMBIENTE_PRODUTOR.md
│   ├── PACOTE_22_LIGACAO_INCREMENTAL_ENTRE_MODULOS.md
│   └── PACOTE_AJUSTE_FINANCEIRO_DISK.md
```

---

## 🗺️ Mapa de Pacotes e Evolução Funcional

| Pacote | Título / Domínio | Principais Entregas |
|---|---|---|
| [Pacote 2](pacotes/PACOTE_2_OPERACAO_FINANCEIRA_REAL.md) | Operação Financeira Real | Esteira de solicitações, saldo disponível, bloqueios cautelares e reservas |
| [Pacote 3](pacotes/PACOTE_3_GATEWAYS_MDR_CONCILIACAO.md) | Gateways, MDR e Conciliação | Roteamento multiadquirente (Cielo, Rede, Stone), cálculo de MDR e conciliação |
| [Pacote 4](pacotes/PACOTE_4_TESOURARIA_BANCOS_PIX_CNAB_CAIXA.md) | Tesouraria & Liquidação | Fila PIX instantâneo, CNAB 240/400 bancário, conciliação e liquidação em lote |
| [Pacote 5](pacotes/PACOTE_5_CONCILIACAO_FINANCEIRA_COMPLETA.md) | Conciliação Financeira Completa | Auditoria de 5 camadas: Pedido × Gateway × Adquirente × Ledger × Extrato Bancário |
| [Pacote 6](pacotes/PACOTE_6_FECHAMENTOS_BORDEROS_DOSSIE.md) | Borderôs, Fechamentos & Dossiê | Termos de encerramento de eventos, apuração de receitas e conferência |
| [Pacote 7](pacotes/PACOTE_7_CONTROLADORIA_RENTABILIDADE.md) | Controladoria & Rentabilidade | DRE gerencial, centros de custos, margem de contribuição e projeções |
| [Pacote 8](pacotes/PACOTE_8_ASSINATURAS_AUTENTIQUE_CONTA_AZUL.md) | Assinaturas Digitais & Integrações | Central de Assinaturas (Autentique ICP-Brasil) e integração ERP (Conta Azul) |
| [Pacote 9](pacotes/PACOTE_9_GOVERNANCA_ALCADAS_SEGURANCA.md) | Governança, Alçadas & SoD | Matriz Maker/Checker, alçadas por valor e segregação de funções |
| [Pacote 10](pacotes/PACOTE_10_CENTRAL_TRABALHO_ALERTAS_SLA.md) | Central de Trabalho, Alertas & SLA | Fila operacional priorizada, monitoramento de prazos e atalhos de navegação |
| [Pacote 11](pacotes/PACOTE_11_VARREDURA_FUNCIONAL_COMUNICACAO.md) | Varredura Funcional & Comunicação | Navegação bidirecional com passagem de protocolo único entre telas |
| [Pacote 12](pacotes/PACOTE_12_FUNCIONALIZACAO_INTEGRAL.md) | Funcionalização Integral do Workflow | Protocolo e workflow únicos, validações de saldo e trava sequencial de assinatura |
| [Pacote 13](pacotes/PACOTE_13_FUNCOES_FINANCEIRAS_AVANCADAS.md) | Funções Financeiras Avançadas | Spread comercial, Divisão de Receitas (Split), Central de Estornos e Previsto × Realizado |
| [Pacote 14](pacotes/PACOTE_14_CONSOLIDACAO_FUNCIONAL_PERSISTENCIA.md) | Consolidação Funcional & Persistência | Persistência reativa, rastreabilidade ponta a ponta e auditoria |
| [Pacote 15](pacotes/PACOTE_15_CORRECOES_REGRESSAO.md) | Correções de Regressão & Estabilidade | Estabilização dos fluxos de aprovação e governança Maker/Checker |
| [Pacote 16](pacotes/PACOTE_16_VISAO_GERAL_FUNCIONAL.md) | Visão Geral Funcional | Submenus especializados: Dashboard Executivo, Posição Geral, Indicadores e Inteligência |
| [Pacote 17 — Taxas e Regras Comerciais](pacotes/PACOTE_17_TAXAS_REGRAS_COMERCIAIS_FUNCIONAIS.md) | Taxas & Regras Comerciais Administrativas | Gestão de MDR, taxas cobradas, spread automático, hierarquia Evento → Produtor → Geral Disk, versionamento e simulador |
| [Pacote 18 — Gateways e Adquirentes](pacotes/PACOTE_18_CENTRAL_GATEWAYS_ADQUIRENTES.md) | Central Operacional de Gateways & Adquirentes | 12 abas operacionais (Credenciais seguras, Bandeiras, PIX, Boleto, Parcelamento, Antifraude, Webhooks, Logs, Relatórios), teste de conexão verídico e pipeline com Taxas e Conciliação |
| [Pacote 19 — Taxas, Tesouraria & Conciliação](pacotes/PACOTE_19_CONSOLIDACAO_TAXAS_TESOURARIA_CONCILIACAO.md) | Consolidação Operacional do Circuito Financeiro | Circuito fechado: simulador de spread, tesouraria operacional (contas corporativas BB/Itaú), CNAB em homologação sem transmissão fictícia, conciliação em 7 camadas e tratamento auditável de ocorrências/divergências |
| [Pacote 20 — Ambiente Produtor](pacotes/PACOTE_20_CONSOLIDACAO_AMBIENTE_PRODUTOR.md) | Consolidação do Ambiente do Produtor | Composição do Saldo transparente, transferência entre eventos com trava de transferível e partidas dobradas no Ledger, versionamento de dados bancários (v2 pendente sem apagar v1 ativa), detalhamento de retenções (R$ 45.000) e timeline de 8 etapas do repasse |
| [Pacote 22 — Ligação Incremental](pacotes/PACOTE_22_LIGACAO_INCREMENTAL_ENTRE_MODULOS.md) | Ligação Incremental entre Módulos | Circuito conectado Solicitação → Aprovação → Assinaturas → Tesouraria → Ledger → Conciliação preservando protocolo + produtor + evento, atalhos contextuais e esteira de assinaturas dinâmica |
| [Pacote Ajuste — Contas Financeiras](pacotes/PACOTE_AJUSTE_FINANCEIRO_DISK.md) | Contas Financeiras & Bancárias | Cadastro de contas pelo Financeiro Disk, homologação Bacen/CIP, máscaras e bloqueio de repasses |

---

## 🏛️ Invariantes Arquiteturais e Regras de Negócio

1. **Assinaturas Sequenciais (Regra Estrita):**
   * O Produtor assina em primeiro lugar;
   * O **Financeiro Disk assina SEMPRE por último**. A interface e o backend bloqueiam a assinatura do Financeiro enquanto o Produtor não assinar.
2. **Segregação de Funções (SoD):**
   * Quem cria a solicitação não pode aprová-la;
   * Quem aprova não pode executar a liquidação na tesouraria;
   * Trilha imutável registrada em cada etapa.
3. **Contas Financeiras vs. Contas Bancárias:**
   * **Conta Financeira (Core):** Subconta contábil que apura e custodia saldos de Produtor/Evento dentro do Ledger (Disponível, Reservas/Bloqueios, Recebíveis Futuros).
   * **Conta Bancária de Repasse (Externa):** Dados bancários externos homologados via Bacen/CIP para onde o dinheiro é efetivamente transferido. Sem conta ativa validada, repasses ficam bloqueados.
4. **Isolamento Multitenant do Produtor:**
   * O Produtor enxerga estritamente suas próprias produções, borderôs e extratos.
   * O Financeiro Disk possui visão transversal consolidada com capacidade de filtro contextual (`Disk → Produtor → Evento`).
