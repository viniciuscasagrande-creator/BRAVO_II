# V0.7 — Base Mestre de Produtores e Comprovantes

## Objetivo
Centralizar o trabalho do Financeiro Disk no produtor/CNPJ e permitir publicação controlada de comprovantes/transações ao portal do produtor.

## Implementado
- Busca mestre por nome, nome fantasia, CNPJ ou ID dentro do Dossiê do Produtor.
- Contexto do produtor preservado pela seleção central já existente no Core.
- Nova aba `Comprovantes e Transações` no Dossiê Financeiro.
- Cadastro de transação/comprovante vinculado a produtor e opcionalmente evento.
- Controle explícito de visibilidade: `Interno Disk` ou `Disponível ao Produtor`.
- Ação de publicar/tornar interno.
- Download de comprovante pelo Financeiro Disk.
- Novo menu `Comprovantes e Transações` no portal do Produtor.
- Produtor visualiza exclusivamente documentos publicados para seu próprio CNPJ.

## Segurança funcional
Anexar um documento não implica publicação automática. A visibilidade é uma decisão explícita do Financeiro Disk.

## Próxima integração de homologação
Substituir armazenamento demonstrativo de metadados/arquivo pelo storage/API oficial do PDT Novo, mantendo os mesmos vínculos `producerId`, `eventId`, `reference` e a flag `visibleToProducer`.
