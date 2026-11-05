# 09 — Plano de execução, pacotes e critérios de aceite

## Sequência recomendada: criar uma máquina funcional, não uma vitrine

| Pacote | Conteúdo | Entrega verificável | Bloqueio para avançar |
|---|---|---|---|
| **00 — Requisitos e desenho greenfield** | Vídeo e 12 fluxos, contratos-alvo, mapa de telas, decisões, dicionário do **novo** banco, backlog e matriz de paridade funcional | ADRs, casos de uso, critérios de aceite, origem dos requisitos e limitações explicitadas | NÃO exigir código-fonte, banco ou exportação do SIGE |
| **01 — Fundação do Core** | Monorepo, IAM, escopos, eventos de domínio, logger, migrations, CI, layout e menu permissionado | Login único, navegação completa autorizada, `/health`, banco e testes em Preview | Build + e2e auth + logs + auditoria + sem dados fictícios |
| **02 — Produtores e Comercial** | Produtor PJ, responsáveis, contratos, proposta e Taxa Disk por evento | Cadastro real e criação/versão/aprovação de condição do evento | Não permitir taxa global automática ou exposição indevida |
| **03 — Eventos e Aprovação** | Event Builder, sessões, locais, áreas, modalidades, lotes, preço, PDVs, publicação | Fluxo completo rascunho→aprovado→publicável em integração controlada | Publicação rejeitada sem pré-condições |
| **04 — Pedidos / Pagamentos / Ingressos** | Inventário, reserva, checkout, integrações sandbox, ticket 8 dígitos, QR, e-mail | Venda simulada **somente em ambiente de testes**, com registros persistentes e conciliação de estados | Concorrência, idempotência, inventário e criptografia aprovados |
| **05 — PDV / Portaria / Cupons** | Caixa/terminal, check-in, cupom e cortesia com quotas | Venda controlada no PDV e validação de ticket sem duplicidade | Regras de saída, cancelamento e offline documentadas |
| **06 — SAC / Alterações / Estornos** | Atendimento multicanal, SLA, casos, troca de sessão, cancelamentos, estorno sandbox | Solicitação SAC → aprovação Financeiro → status do provedor, com logs | Estorno real bloqueado e trilha/estados testados |
| **07 — Financeiro Disk** | Ledger, adquirentes, taxas/MDR, recebíveis, saldos, repasses, adiantamentos, borderôs e conciliação | Dashboard a partir do ledger, saldos por evento/produtor e aprovações formais | Zero discrepância sem justificativa nos cenários conciliados |
| **08 — Marketing / Remarketing** | Campanhas, UTMs, pixels, consentimento, envios e pós-evento | Atribuição de vendas, segmentos autorizados e relatórios reais | Consentimentos, opt-out e proteção de dados validados |
| **09 — PDT / Piloto de novos eventos / Dados opcionais** | Adaptador PDT, implantação para eventos novos, importador opcional apenas se houver exportações autorizadas | Portal do produtor restrito; novos dados reconciliados; legados só se realmente disponíveis | Não migrar ingressos ativos sem fontes verificáveis, checklist e evidências de corte |
| **10 — Inteligência e otimização** | BI, relatórios, alertas, melhorias de performance e módulos empresariais futuros | Métricas, SLO, dashboards e operação assistida | Sem degradação de emissão, pagamento ou check-in |

**Trabalho paralelo seguro:** o frontend pode criar wireframes e componentes de cada módulo enquanto o backend finaliza contratos; porém evitar abrir rotas com botões inertes ou dados falsos. Cada incremento deve oferecer um fluxo funcional vertical.

## Definition of Done por rota/tela
- [ ] Possui fonte de dados real documentada (ou estado vazio honesto).
- [ ] Botões e submenus têm destino e ação válidos; zero placeholders que fingem estar operacionais.
- [ ] Autorização validada no servidor, com escopo de produtor/evento.
- [ ] Validação de entrada/saída, tratamento de erro e estado de carregamento úteis.
- [ ] Logs de auditoria para leitura sensível e mutações críticas.
- [ ] Teste unitário + integração + e2e da jornada e do caso de erro.
- [ ] Build, lint, typecheck e migrations funcionam no CI.
- [ ] Tela responsiva e toda a interface em pt-BR.
- [ ] Nenhuma movimentação bancária real fora de ambiente autorizado e regra de liberação.
- [ ] Documentação de API e responsável pelo módulo atualizada.

## Testes E2E essenciais (mínimos)
1. Comercial cria produtor PJ e vincula evento corretamente.
2. Dois eventos do mesmo produtor recebem **taxas Disk diferentes** sem interferência.
3. Evento sem aprovação comercial não publica, mesmo com cadastro preenchido.
4. Site e PDV concorrem pelo último assento; somente um recebe emissão.
5. Checkout confirmado em sandbox emite ticket numérico de oito dígitos e envia e-mail uma vez, mesmo com webhook repetido.
6. Ingresso inválido/cancelado/validado não permite entrada indevida.
7. Cupom tem limite de uso; cortesia tem quota aprovada e auditoria.
8. SAC troca sessão: estoque e credenciais ajustados corretamente e histórico mantido.
9. SAC solicita estorno; Financeiro aprova; status só conclui após callback confirmado.
10. Financeiro distingue bruto vendido, recebido, receita Disk e obrigação com produtor.
11. PDT produtor A não acessa evento do produtor B; Taxa Disk interna não vaza.
12. Repasse entra em fluxo de aprovação, assinaturas exigidas e conciliação.
13. Cancelamento/adiamento do evento gera plano financeiro e comunicações sem emissão adicional indevida.
14. Acesso a relatórios, log e exportação respeita perfil e deixa trilha auditável.
15. Falhas intermitentes de gateway/e-mail/PDV geram retry seguro, sem duplicidade de ingresso ou dinheiro.

## Métricas operacionais
Disponibilidade do checkout, latência de reserva/compra, tempo de publicação, divergências de conciliação, tempo médio de primeiro atendimento e resolução SLA, proporção de estornos sem retorno de provedor, taxa de entrega de ingresso, tempo de validação em portaria e número de violações de permissões. Estabelecer SLOs medidos em homologação antes de prometer valores comerciais.

## Regras de trabalho com Gemini
1. Executar pacote de cada vez, com commit/tags e relatório de alterações.
2. O Gemini deve demonstrar código funcional, não descrever o que 'estaria pronto'.
3. A cada pacote executar migrations, testes, e2e mínimo, build e checklist de paridade.
4. Se faltar integração real, implementar interface de provedor com **sandbox/mock restrito a teste**, declarar a pendência e manter produção desabilitada.
5. Não converter faltas de informação em valores fictícios, taxas padrão ou comportamentos bancários automáticos.
