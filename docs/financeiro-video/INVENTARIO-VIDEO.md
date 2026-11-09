# BRAVO_II — Inventário completo de telas da gravação

Fonte: `20261109-1631-33.8154170.mp4` (248,448 segundos, 1908 × 642).

**96 telas de navegação e 15 grupos** preparados. O título das telas e a divisão de subitens combinam o que foi visível na gravação e o inventário do backup financeiro fornecido.

**Importante:** estes itens são telas/interfaces com contrato de consulta; NÃO representam 100% das operações financeiras implementadas. A gravação não comprova APIs ou persistência de todas elas.

| Trecho do vídeo | Grupo | Telas preparadas |
|---|---|---|
| 00:00 (aproximado) | **Produtores e Eventos** | Produtores, Eventos, Conta Financeira do Produtor (CNPJ), Saldos por Produtor, Saldos por Evento |
| 00:00 (aproximado) | **Solicitações e Aprovações** | Central de Solicitações, Central de Aprovações, Repasses, Política de Repasses, Antecipações, Divisão de Receitas, Transferências entre Eventos, Assinaturas Pendentes |
| 00:00 (aproximado) | **Recebíveis e Liquidações** | Contas a Receber, Recebíveis, Agenda de Recebíveis, Liquidações, Agenda Financeira |
| 00:12 (aproximado) | **Gateways e Adquirentes** | Visão Geral de Gateways, Cadastro de Adquirentes, Bandeiras e Cartões, MDR e Parcelamento, Credenciais e Conexões, Autorizações e Capturas, Antecipação de Recebíveis, Liquidação por Operadora, Conciliação Contábil e Ledger, Estornos, Chargebacks e Disputas, Relatórios por Gateway |
| 00:36 (aproximado) | **Taxas e Regras Comerciais** | Matriz de Tarifas MDR, Regras Comerciais, Simulador de Spread, Políticas de Parcelamento, Prazos de Liquidação, Taxa Disk por Evento, Spread e Adquirentes, Rebate Comercial, Advanced / Antecipação Comercial, Hierarquia de Prioridades |
| 01:32 (aproximado) | **Tesouraria e Contas Bancárias** | Posição de Caixa, Contas Corporativas, PIX e Transferências Instantâneas, CNAB 240 / 400 Bancário, Contas a Pagar, Pagamentos em Lote, Transferências entre Contas, Fluxo de Caixa, Movimentações Bancárias |
| 02:00 (aproximado) | **Conciliação** | Painel Geral de Conciliação, Conciliação de Adquirentes, Conciliação Bancária, Conciliação do Ledger, Tratamento de Divergências, Auditoria de Conciliação |
| 02:20 (aproximado) | **Estornos e Cancelamentos** | Centro de Controle de Estornos, Fila de Aprovações, Motor de Regras de Estorno, Chargebacks e Contestações, Impactos Financeiros e Reservas, Histórico de Estornos |
| 02:36 (aproximado) | **Fechamentos e Borderôs** | Fechamento por Evento, Borderôs e Fechamentos, Dossiês Financeiros, Documentos e Comprovantes |
| 02:48 (aproximado) | **Controladoria e Planejamento** | Controle Orçamentário, Projeções de Caixa, DRE por Evento, DRE DiskIngressos, Centros de Custo, Rentabilidade de Eventos |
| 02:56 (aproximado) | **Fornecedores e Contratos** | Gestão de Fornecedores e Contratos, Vencimentos Contratuais, Pedidos de Compras |
| 03:00 (aproximado) | **Ledger Financeiro** | Lançamentos Contábeis, Razão e Balancete, Trilha de Auditoria do Ledger |
| 03:08 (aproximado) | **Relatórios Financeiros** | Relatórios por Produtor, Relatórios por Evento, Relatório de Repasses, Relatório de Antecipações, Extrato Financeiro |
| 03:16 (aproximado) | **Central de Assinaturas** | Central de Assinaturas, Documentos para Assinatura, Autentique / Assinaturas, Integração Conta Azul, Sincronizações, Logs de Integração |
| 03:32 (aproximado) | **Governança Financeira** | Governança — Visão Geral, Usuários Financeiros, Perfis e Permissões (RBAC), Alçadas de Aprovação, Segregação de Funções (SoD), Operações Sensíveis e Críticas, Bloqueios e Exceções, Auditoria de Acessos, Configurações de Governança |

## Cobertura efetivamente observada

- 00:00–00:35: Contas a Receber, composição de meios e prazos de liquidação, Gateways/Adquirentes e seus fluxos.
- 00:36–01:30: Taxas e Regras Comerciais, configuração modal MDR/spread, simulador, regras e Tesouraria.
- 01:32–02:20: Contas, PIX, CNAB, transferências, conciliação e divergências.
- 02:20–03:12: Centro de Estornos, chargebacks, borderôs, controladoria, fornecedores, ledger e relatórios.
- 03:12–03:56: Antecipações, assinaturas, Conta Azul, governança, usuários, perfis e políticas.
- 03:56–04:08: Produtores, conta financeira por CNPJ e saldos individuais por evento.

## Fidelidade e limites

- Os nomes e hierarquias reconstruídos devem passar pela revisão visual do usuário; o vídeo alterna menus rapidamente e não revela todos os campos de cada formulário.
- Os itens não observáveis diretamente foram adicionados como decomposição lógica do grupo/backup, não como afirmação de que uma tela idêntica aparece no vídeo.
- O código original fica arquivado em `REFERENCIA_ORIGINAL/Modulo_Financeiro...zip` e não é executado no backend do BRAVO_II.
- A implantação é aditiva: não substitui o Financeiro/RH nem as migrations existentes.
- Os serviços de leitura precisam ser integrados um por um pelo Gemini/VS Code.
