# 02 — Catálogo de módulos e navegação do BRAVO_II

## Princípio de modularidade
Uma **página** não é necessariamente um módulo. Cada módulo tem dono de domínio, entidades, regras, comandos, consultas, testes, logs, eventos publicados e autorização. Apps (backoffice, PDT, site e PDV) são **canais**, não bancos separados. Menus são visões do mesmo domínio e devem ser gerados a partir de permissões reais.

## Menu lateral interno proposto

1. **Início / Central Operacional** — indicadores reais, fila de aprovações, alertas, eventos do dia e pendências por função.
2. **Comercial** — Produtores (PJ), contatos e responsáveis, carteira/negociação, propostas, contratos, **Taxa Disk por evento**, aprovações comerciais e histórico.
3. **Eventos** — Central de Eventos, Novo Evento, análise e aprovação, sessões/agendamentos, locais, modalidades/lotes, setores/mapas/assentos, disponibilidade/bloqueios, conteúdo/publicação, documentação, cancelamentos e adiamentos.
4. **Pedidos e Vendas** — Pedidos, detalhes/alterações, vendas online, PDV/caixa, pontos de venda, transações, reservas, emissão/reenviar ingressos e fechamento por canal.
5. **Ingressos e Portaria** — Consulta de Ingressos, troca de sessão/setor, emissão/reemissão, QR e credenciais, cancelamento/bloqueio, dispositivos e check-in, trilhas de entrada.
6. **SAC / Atendimento** — Central de Atendimento, fila e tickets, canais, SLA e calendário, incidentes e problemas, mudanças, base de conhecimento, qualidade/CSAT, relatórios.
7. **Cupons e Cortesias** — Campanhas de cupons, códigos, regras, cotas, autorizações de cortesias, emissão em lote, resgates, auditoria.
8. **Financeiro Disk** — Visão Geral, Recebimentos, Saldos por Evento, Saldos por Produtor, Ledger, Tesouraria, Repasses, Antecipações, Transferências, Taxas e Condições, Spread/Rebate/Advanced, Gateways e Adquirentes, Conciliação, Despesas/Retenções, Borderôs, Auditoria Financeira.
9. **Estornos e Contestação** — Solicitações, análise financeira, aprovações, processamento no provedor, chargeback/contestação, conciliação, situações de evento cancelado.
10. **Marketing** — Painel de Campanhas, eventos e públicos, UTMs, Meta Ads, Google Ads/Analytics, TikTok Ads, Spotify Ads, atribuição, pixels/CAPI, relatórios por campanha.
11. **Remarketing e Pós-Evento** — Segmentos, consentimentos/privacidade, jornadas, WhatsApp, e-mail, SMS, disparos, pesquisa pós-evento, exportações autorizadas.
12. **Produtores / PDT** — Gestão de Acessos PDT, vínculos a eventos, cotas/cortesias/bloqueios, solicitações, borderôs, relatórios e configurações de acesso (administração interna da integração).
13. **Relatórios e Inteligência** — Catálogo de relatórios, eventos, vendas, tickets, financeiro, SAC, campanhas, exportações e auditoria de exportação.
14. **Cadastros e Operações** — Clientes PF, locais, PDVs, agentes, fornecedores, catálogo auxiliar, documentos, comunicados, mensagens.
15. **Administração e Governança** — Usuários, perfis, permissões por ação e escopo, políticas, aprovações, logs, integração, observabilidade, parametrização, privacidade, saúde do sistema.

> Módulos adicionais de **Contabilidade, Fiscal, RH/DP e Compras** poderão entrar em trilhas separadas, se forem parte do escopo contratual do ERP completo. Não transformar seu simples registro em telas operacionais falsas. O financeiro já deve emitir dados contábeis por integração sem misturar as obrigações dos eventos com a contabilidade própria da empresa.

## Módulos de domínio (contratos)

| ID | Módulo | Entidades/Responsabilidades | Não pode executar |
|---|---|---|---|
| IAM | Identidade & acesso | Usuários, sessões, papéis, escopos, MFA, auditoria de acesso | Aprovar negócio por conta própria |
| ORG | Produtores PJ | Pessoa jurídica, beneficiários/representantes, vínculos e documentação | Definir taxa definitiva sem Comercial |
| CRM-B2B | Comercial | Propostas, contratos e regras de taxa por evento | Mexer em ingressos emitidos |
| CRM-B2C | Clientes PF | Cadastro, preferência, consentimento e histórico permitido | Ler recursos de outros clientes sem permissão |
| EVT | Eventos | Evento, sessão, local, área, setor, modalidade, preço, conteúdo, publicação | Autorizar pagamentos/estornos |
| INV | Inventário | Assentos, quotas, bloqueios, reservas e lotes de estoque | Reconhecer receita |
| ORD | Pedidos | Carrinho, itens, status, alterações, histórico | Confirmar pagamento sem resposta comprovada |
| TKT | Ingressos | Emissão, código oito dígitos, QR, transferência e status | Emitir ingresso pago antes de regra de pagamento |
| POS | PDV & Caixa | Terminal, operador, PDV, pagamentos locais e fechamento | Descontar estoque sem contrato do INV |
| PAY | Pagamentos | Intenção, autorização, captura, confirmação, liquidação e webhooks | Definir receita contábil como total de vendas |
| CS | SAC | Casos, SLA, canais, contatos e solicitações | Estornar diretamente sem fluxo financeiro |
| CPN | Cupons & Cortesias | Campanhas, limites, aprovação, códigos e resgates | Mudar preço contratual sem rastreabilidade |
| RFD | Estornos & Disputas | Regras, solicitações, autorização, provedor, contestações | Confirmar estorno antes do provedor |
| FIN | Ledger & Financeiro | Contabilização auxiliar, obrigações, saldos, retenções, conciliação, repasses | Apagar lançamento imutável |
| FEE | Motor de Taxas | Taxa Disk por evento, MDR, comissões por canal e políticas especiais | Expor Taxa Disk contratual interna para PDT |
| MKT | Marketing | Campanhas, UTMs, eventos de conversão e relatórios | Alterar pedidos pagos |
| MSG | Remarketing | Segmentos, consentimentos, disparos, custos, logs de entrega | Enviar sem base legal/opt-out adequado |
| PRT | PDT | APIs e projeções autorizadas para produtor, fluxo de solicitações | Acessar eventos de produtor alheio |
| GATE | Check-in / Portaria | Validação QR, dispositivos, offline controlado e logs | Revalidar o mesmo ingresso para entrada única |
| AUD | Governança | Auditoria estruturada, riscos, aprovações, exportações | Modificar conteúdo histórico do audit log |
| REP | Relatórios / BI | Consultas e projeções derivadas com definição de métricas | Criar fonte alternativa de saldo financeiro |

## Contextos e propriedade de dados
- **Dados mestres:** ORG, CRM-B2C, EVT e IAM são fontes únicas para seus registros.
- **Comercial:** contratos e Taxa Disk são definidos no CRM-B2B/FEE, e copiados em *snapshot contratual* para cada venda; jamais recalcular vendas passadas ao alterar condição futura.
- **Fluxo de pedido:** ORD orquestra INV, PAY e TKT, mas cada módulo mantém a própria lógica e expõe serviços tipados.
- **Financeiro:** FIN consome transações confirmadas e não confia na interface como autoridade de valores.
- **Governança:** AUD observa todos os domínios e guarda eventos de negócio e de acesso; logs de debug não substituem trilha de auditoria.

## Navegação por perfil
O menu é filtrado **no servidor e no frontend** pela combinação `ator + papel + módulo + ação + produtor + evento + contexto`. O usuário faz login uma vez; mudar de submenu **não pede nova senha**. Ações de alto risco podem requerer MFA/reauth pontual, sem reproduzir os problemas de navegação do legado.

## O que preservar do SIGE
Cadastro e busca de clientes, cadastro e pesquisa de evento, modalidades, lotes/setores, PDVs, pagamento, pedido, ingressos, cupons, produtores vinculados, permissões, bloqueios, mapa, borderô, despesas, logs, imagens, documentos e relatórios. Itens como Estoque/Entregas/E-commerce legados exigem inventário de uso antes de migração ou descontinuação.
