# Pacote 15 — Correções Funcionais e Regressão Geral

Correções aplicadas após validação visual em vídeo do Financeiro V1.

## Corrigido nesta entrega
- Saldos do Financeiro Disk passam a ter tela administrativa própria, sem reutilizar indevidamente a tela do Produtor.
- Abas Consolidado, Por Produtor, Por Evento, Disponível, A Receber, Bloqueado, Em Reserva e Valores em Trânsito agora recalculam e filtram os registros exibidos.
- Filtros de Produtor e Evento atualizam o estado global e a tabela.
- Ver Dossiê abre dossiê financeiro do produtor com saldos, eventos e pendências e permite continuar para Conta Financeira/Aprovações.
- Central de Aprovações permanece conectada ao mesmo estado operacional.
- Botão Atualizar deixou de declarar falsa sincronização com Core real; em homologação informa corretamente que recalcula o estado persistido.
- A rota Financeiro Disk > Saldos foi separada da rota de Saldos do Produtor.

## Regra de regressão
Nenhuma ação deve ser marcada como operacional se apenas trocar CSS/estado visual. Filtro deve alterar dados; ação deve navegar com contexto ou persistir uma mudança; integração externa deve indicar pendência enquanto não houver backend/credenciais homologados.
