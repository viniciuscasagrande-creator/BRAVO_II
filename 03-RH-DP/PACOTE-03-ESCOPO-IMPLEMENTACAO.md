# Pacote 03 — RH Disk, Departamento Pessoal e Disk Ponto (45 funções)

**Obrigatório no BRAVO_II:** todas as 45 opções do menu original, submódulos de RH Disk V1 (fases 1–10), variantes documentadas V2.2/V2.3 e aplicativo Disk Ponto. A contagem de 45 é das opções do menu, não da quantidade de rotas de API ou entidades.

## Fontes de código do backup

- `js/views/rh/rhViews.js`: views do RH integrado; a camada V2.3 usa `localStorage` (`diskRH.v23.operacao`) e registros seed.
- `backend/src/rh/`: RHService (memória), API e endpoints para ponto, geofences, staff e auditoria.
- `RH_DISK_V1/apps/api/src/index.ts`: fluxos mais amplos (folha, férias, admissão, GED, benefícios, eSocial, staff), mas arrays em memória e autenticação demonstrativa.
- `RH_DISK_V1/apps/web/`: aplicação web independente.
- `RH_DISK_V1/apps/mobile/`: app Expo da arquitetura RH.
- `mobile/disk-ponto/`: aplicativo mobile separado para ponto, GPS, ajustes, espelho e sincronização.
- `RH_DISK_V1/prisma/schema.prisma`: **22 modelos** de referência identificados; revalidar relações e nomes antes de implantar; consolidar com schema BRAVO_II, não montar banco paralelo.
- `README_RH_V2_2.md`, `README_RH_V2_3.md`, `docs/RH_DISK_V2_3_OPERACAO_REAL.md`, `RH_DISK_V1/README.md`, testes do RH.

## Subdomínios e entregas

| Subdomínio | Funcionalidades | Regras e riscos |
|---|---|---|
| Pessoas e estrutura | Funcionários CLT/PJ/estágio/temporários, cargos, salários, organograma, patrimônio, documentos | Identidade única; dados pessoais somente por necessidade de trabalho |
| Admissão & offboarding | Admissão digital, onboarding, GED, contratos, rescisões, desligamentos | Checklists e evidências, sem emissão oficial automática até validação |
| Rotinas DP | Férias, ausências, atestados, 13º, benefícios, folha e holerites | Acesso restrito; regras legais e tabelas atualizáveis por competência |
| Ponto & jornadas | Jornada, escalas, geofences, ponto móvel, banco horas, ajuste e fechamento | Não alegar certificação MTE/Portaria 671 sem validação especializada |
| Talentos | Recrutamento, desempenho, PDI, treinamentos | Avaliações restritas e consentimentos/base legal apropriada |
| SST | Saúde e segurança, EPIs, exames, documentos médicos | Segregação adicional de dados de saúde (LGPD) |
| Eventos & equipes | Staff, freelancers, escalas por evento, custos/diárias e reembolsos | Alocação por evento e centro de custo; sem pagar automaticamente |
| Portal do colaborador | Dados próprios, holerites, solicitações e ponto | Escopo por identidade, não por parâmetros do frontend |
| Portal gestor | Equipe sob responsabilidade e aprovações | SoD, evitar autoaprovação |
| Administração RH | Permissões, integração, auditoria e exportações | Auditoria com mascaramento de dados pessoais |

## Ponto móvel: estratégia

- Reaproveitar desenho de fluxo dos aplicativos originais; escolher **uma** implementação canônica do Disk Ponto e aposentar a duplicada somente após equivalência funcional.
- Enviar batidas para backend seguro com idempotency-key e NSR gerado centralmente; fila offline cifrada, replay e rejeição de batidas duplicadas.
- Registrar integridade, localização com minimização, autorização de dispositivo, geofence por escala/evento e comprovante.
- Verificar requisitos vigentes de Portaria 671/2021, REP-P, AFD/AEJ, exigências de registro e provas, e privacidade antes do uso real.

## Folha, eSocial e benefícios

- Tabelas tributárias (INSS, IRRF, FGTS e legislação correlata) devem ser versionadas por competência; backup é referência histórica, não motor validado de 2026.
- Cálculos: bruto, HE, DSR, adicionais, férias, 13º, benefícios, descontos, bases e líquido, com eventos de rastreabilidade por item.
- Estado do lote: `RASCUNHO` → `EM_REVISAO` → `APROVADO_RH` → `AGUARDANDO_FINANCEIRO` → `APROVADO_FINANCEIRO` → `EM_PROCESSAMENTO` → `LIQUIDADO` ou `FALHA`.
- O RH não executa PIX/CNAB; envia **solicitação** aprovada ao Financeiro Disk. Não misturar valores de folha empresarial com receita de ingressos.
- eSocial: gerar apenas arquivos/validações em ambiente de homologação até conferência do leiaute oficial vigente, regras de transmissão e autorização da empresa.

## Problemas críticos do código legado a NÃO transportar

1. `backend/src/app.ts` registra `/api/rh` sem `authMiddleware`. Corrigir **P0** antes de disponibilizar endpoints reais.
2. `RH_DISK_V1/apps/api/src/index.ts` retorna token para login `admin`/usuário conhecido sem validar senha na condição observada. Substituir identidade **P0**.
3. `RHService` guarda colaboradores, ponto e auditoria em Maps/arrays; operação não persiste em reinício.
4. `js/views/rh/rhViews.js` usa `localStorage` e seed para processos V2.3.
5. O backend original inclui cadastros e saldos fictícios; não migrá-los para produção.
6. CPF, salário, banco e atestados têm exigência de confidencialidade; cifrar campos necessários, auditar acesso e definir retenção.

## Critério de conclusão

- 45/45 opções implementadas ou com pendência individual explícita, nenhuma excluída.
- Testes de perfil Colaborador/RH/Gestor/Financeiro e de privacidade negativa.
- Dados de folha somente integrados a Tesouraria via contrato, com dupla autorização e confirmação externa.
- Exportação/backup, histórico, logs, segurança, integração Disk Ponto e falhas offline testados.
