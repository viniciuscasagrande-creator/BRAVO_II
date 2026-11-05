# PROMPT MESTRE — BRAVO_II NO VS CODE / GEMINI

Trabalhe **dentro deste repositório BRAVO_II**, preservando todos os arquivos de `referencias/FONTE_ORIGINAL_FINANCEIRO_RH/` intocados. O SIGE original NÃO está disponível; o BRAVO_II será reimplementado do zero. Esta fonte contém o Módulo Financeiro V1, RH Disk V1/V2.3 e aplicativo Disk Ponto. Não tratar código demonstrativo como produção.

## OBJETIVO INEGOCIÁVEL

Incorporar à nova plataforma **todas as 149 opções de menu (104 Financeiro e 45 RH)** e todas as capacidades adicionais observadas no backend e aplicativos da referência. A matriz oficial de rastreabilidade é `00-INVENTARIO/catalogo-completo-financeiro-rh.json`. Os menus não devem depender de login individual; uma sessão central com autorização servidor e escopo de dados por papel.

## ORDEM DE EXECUÇÃO

**1. Diagnóstico e bootstrap.** Ler GEMINI.md, README, `00-INVENTARIO/` e `01-FUNDACAO`. Criar monorepo BRAVO_II com Next.js, NestJS, PostgreSQL, contratos, testes, CI, identidade e RBAC/ABAC. Entregar menu navegável com as 149 rotas e estados vazios; o `05-PREVIEW` é só referência para hierarquia e cobertura.

**2. Financeiro Disk.** Ler `02-FINANCEIRO` e portar as 104 funções por domínio. Cada rota deve ter API tipada, persistência, autorização, validações, trilha de auditoria, testes e leitura/escrita real dentro de homologação. Portar motor de elegibilidade, taxa Disk por evento, MDR/spread/rebate, ledger, recebíveis, conciliação, repasse/antecipação, estornos e controladoria. Não ligar transação bancária.

**3. RH e DP.** Ler `03-RH-DP` e portar 45 opções e os dois conjuntos de serviços. Consolidar uma única fonte de colaboradores, folha, ponto, dispositivos, geofences e staff. Preservar Disk Ponto e ciclo offline. Dados médicos e individuais protegidos. Ponto, folha e eSocial não podem ser declarados homologados legalmente sem revisão de requisitos oficiais vigentes.

**4. Integração.** Ler `04-INTEGRACAO`, criar outbox, filas, idempotência, alçadas e transação no PostgreSQL. Integrar folha/staff aprovado à Tesouraria, aprovação financeira separada de pagamento, confirmação externa, conciliação e auditoria. Não transmitir nada ao banco em desenvolvimento.

## DECISÕES IRREVOGÁVEIS NESTA ETAPA

- Nunca alterar a fonte original, apagar submenus ou reduzir a cobertura.
- Fonte de Taxa Disk = **evento**, não taxa padrão do produtor; comercial define valor fixo ou percentual.
- Preservar o Portal do Produtor existente; apenas BFF/API, sem refazê-lo inadvertidamente.
- RH solicita lote de pagamento; Financeiro autoriza; banco confirma. Sem botão de pagar sem gateway.
- Autenticação real de servidor e MFA conforme criticidade, substituindo tokens demo.
- Sem dados fictícios de negócio. Sem autoaprovação. Sem registros financeiros em `localStorage`.
- Cada ação sensível gera evento auditável append-only.
- Separar receita própria Disk, saldo/obrigação do produtor e despesas empresariais da Disk.
- Usuários internos vêem seus módulos por permissão; produtor não enxerga taxas internas, financeiro de outros produtores nem dados de RH.

## ENTREGA NO FINAL DE CADA PACOTE

1. Lista dos IDs do catálogo migrados e IDs restantes, sem omissões.
2. Código executável, migrations e exemplos de API sem dados simulados.
3. Testes automatizados, relatório de regressão e evidências de build.
4. Alterações em roles/permissions, segurança negativa, auditoria, riscos.
5. Como executar localmente no VS Code e em preview.
6. Confirmação explícita de que nenhum banco/gateway real foi acionado.

**Agora execute SOMENTE o Pacote 01.** Não pule direto para produção e não presuma que a fonte legado já faz parte do novo backend.
