# Sequência proposta após o Pacote 08

A conclusão do P08 **depende** do Core P07 e da homologação PostgreSQL. Próximos pacotes devem ser planejados sem declarar funções como operacionais antecipadamente:

- **Pacote 09 — Checkout e PDV de homologação:** autenticação por terminal, canais, tabela de formas de pagamento, homologação de gateways, reconciliação e webhook idempotente. Proibir transações reais até aceite formal.
- **Pacote 10 — Bilheteria, mapa e inventário por assento:** lotação por setor, bloqueio de poltronas por sessão, expiração concorrente e portaria/QR.
- **Pacote 11 — SAC e pós-venda:** ITIL/SLA, troca de sessão, cancelamento, eventos adiados, solicitações de estorno e autorização Financeiro.
- **Pacote 12 — Cupons, cortesias e campanhas:** regras por evento/sessão/lote, alçadas, teto, auditoria e antifraude.
- **Pacote 13 — Portal do Produtor (PDT):** contrato de APIs limitado por evento e produtor, borderô, mapa, repasses, antecipações, solicitações e permissões.

**Dependências obrigatórias**: Financeiro Disk + RH seguem preservados no catálogo; sua migração para o Core ocorrerá por etapas separadas, com teste de integridade por função e compatibilidade de esquema. Não alterar o site público da DiskIngressos nesta fase.
