# 08 — Transição operacional SEM código-fonte do SIGE

**Condição confirmada:** código-fonte do SIGE indisponível. **Condição não confirmada:** acesso ao banco, exportações ou APIs antigas. O BRAVO_II nasce independente, com banco e repositório próprios. Leia `docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md`.

## Caminho principal: implantação por novos eventos
1. Construir e homologar todas as funções novas no BRAVO_II sem tocar o legado.
2. Escolher um evento futuro ainda sem vendas para o primeiro piloto, sujeito à validação da DiskIngressos.
3. Publicar esse evento apenas pelo canal integrado que estiver homologado; não aceitar duas fontes de escrita de inventário.
4. Operar, monitorar e conciliar pedidos, tickets, pagamentos e acessos integralmente originados no BRAVO_II.
5. Ampliar por lotes de novos eventos quando os critérios de segurança, SAC, financeiro e portaria forem aprovados.

## Dados legados: importar APENAS se houver fonte real
Possíveis entradas: CSV, Excel, relatórios exportáveis, arquivos oficiais ou API autorizada. Cada uma exige amostragem, dicionário de campos **validado**, proteção de dados e acordo de reconciliação. O fato de o usuário não ter o código-fonte não prova que não haja exportação; até que essa possibilidade seja confirmada, tratar como indisponível.

### Caso A: exportação ou API disponível
- Abrir um projeto separado de ingestão em staging, não dentro da API transacional.
- Mapear campos explicitamente; criar `import_batch`, `source_system`, `source_record_id`, checksum e log de problemas.
- Validar documento, identidade, status, valores, IDs e número de ingresso; deduplicar somente após regra de negócio aprovada.
- Conferir totais por evento, produtor, canal, sessão, pagamento e status, com evidências assinadas.
- Migrar evento ativo somente com estoque, assento, tickets, cobranças, estornos, QR e histórico críticos verificáveis; se faltar, não migrar.

### Caso B: sem qualquer acesso a dados anteriores
- Usar exclusivamente a base nova para operações e eventos **iniciados no BRAVO_II**.
- Não recriar ou simular histórico, vendas, clientes, bilhetes, saldos ou repasses passados.
- Manter separação inequívoca de pedidos/tickets antigos; definir atendimento operacional legado/contingência com a equipe.
- Não anunciar capacidade de consultar, cancelar, reembolsar ou validar tickets legados no BRAVO_II.
- Não desligar o legado até resolver obrigações operacionais dos eventos antigos.

## Critérios de virada
**Go:** evento novo, inventário único, checkout/PDV, emissão, SAC, estorno sandbox, contabilidade/ledger, mapa/check-in, e-mail, segregação de acessos e rollback testados. **No-go:** dados históricos incompletos em evento ativo, duplicidade de estoque, falha de conciliação, token QR sem validação confiável, incapacidade de honrar estornos ou ingressos vendidos previamente.

## Matriz de paridade funcional
Inventariar por comportamento: `tela legada observada → caso de uso BRAVO_II → permissões → estado → testes → aceite do departamento`. Essa matriz não requer fonte ou banco do SIGE; ela não prova paridade de dados legados. Toda diferença não vista ou não validada fica como pendência explícita.
