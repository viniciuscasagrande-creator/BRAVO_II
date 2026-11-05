# PROMPT 03 — Event Builder, aprovação e rastreabilidade

Leia `docs/01-MENUS-E-TELAS.md`, `docs/02-JORNADA-OPERACIONAL-E-ESTADOS.md`, `apps/api/src/modules/pacote06/events.service.ts` e a página `apps/backoffice/src/app/(erp)/eventos/[id]/page.tsx`.

Tornar funcional o Event Builder da DiskIngressos:
1. Geral/Calendário — nome, descrição, lugar, classificação, política pública, produtor principal, início/fim e abertura de vendas.
2. Contratos/Produtores — principal + secundários, vínculo e alçadas.
3. Sessões — data/hora, capacidade por sessão.
4. Áreas e mapas — áreas, assentos numerados/livres, prevenção de duplicidade; editor de mapa posterior.
5. Modalidades, lotes e preços — categoria, comprovação, vigência, preço nominal em centavos, estoque/capacidade.
6. Canais — ONLINE, PDV, BILHETERIA sem habilitar vendas reais até integração.
7. Comercial — referência da Taxa Disk aprovada, somente interno autorizado.
8. Conteúdo público — imagens, descrição, classificação, URL da política e autorização de uso.
9. Aprovações — CADASTRAL → COMERCIAL → OPERACIONAL → PUBLICACAO, segregação de atores e motivos de reprovação.
10. Auditoria — diff/versões de cada alteração e estado visível; não editar diretamente evento publicado.

Conectar tudo a API real com notificações claras, lista vazia se sem dados. Testar `403` por perfil, pendências de aprovação, capacidade, transições inválidas, edição após submissão, concorrência e erro de rede.

Não encerrar enquanto não houver navegação sem 404/segundo login e build/testes rodados em Preview.
