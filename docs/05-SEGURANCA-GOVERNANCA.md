# 05 — Segurança, permissões, conformidade e auditoria

## Princípio de autorização
Toda ação é avaliada por `usuário + função + permissão + produtor + evento + recurso + estado + política`. O **PDT nunca recebe dados internos de outros produtores/eventos**. Permissões de menu são conveniência; a proteção obrigatória acontece na API, nas consultas e nos jobs.

## Perfis iniciais
| Perfil | Pode | Não pode por padrão |
|---|---|---|
| Administrador do BRAVO_II | Gerenciar perfis/parametrizações, consultar auditoria e funcionamento | Executar movimento financeiro sem permissão e segregação operacional |
| Desenvolvedor/Infra | Configuração técnica, deploy, observabilidade sem dados desnecessários | Acessar PII/realizar repasses por ter acesso a código |
| Comercial Disk | Cadastrar PJ, contrato, negociar taxas do evento e propor aprovação | Aprovar pagamentos/estornos ou reescrever ledger |
| Operação de Eventos | Preparar evento, sessão, mapa, modalidades e publicação conforme fluxo | Alterar condições financeiras aprovadas sem reanálise |
| Financeiro Disk | Ver saldos autorizados, taxas internas, conciliação, aprovação de estornos/repasses | Exceder limites da matriz; aprovar a própria solicitação quando segregação for exigida |
| SAC | Consultar cliente/pedido/ingresso necessário, abrir casos, solicitar trocas/estornos | Efetivar estorno bancário, visualizar Taxa Disk restrita |
| Marketing | Campanhas, pixels, públicos permitidos e métricas | Acessar dados financeiros sensíveis ou exportar mailing sem fundamento |
| Produtor (PDT) | Apenas eventos vinculados; borderô, mapa, relatórios, cortesias e solicitações autorizadas | Ver eventos alheios, Taxa Disk interna, taxas de adquirência da Disk, aprovação final |
| PDV/Caixa | Vender nas sessões e terminais liberados, consultar seu caixa e fechamento | Configurar taxas globais, aprovar estorno |
| Portaria | Validar credenciais e exibir dados mínimos de ingresso | Ver pagamento, CPF completo, contrato comercial |
| Auditor | Ler trilhas e produzir relatórios conforme necessidade | Excluir logs ou intervir em operações |

**Atenção:** poder administrativo e poder de liquidação financeira não são automaticamente equivalentes. Não criar superusuário irrestrito para uso comum. Acesso excepcional (*break-glass*) exige justificativa, tempo limitado e auditoria reforçada.

## Controles recomendados
- SSO/OIDC, MFA para perfis privilegiados, expiração/revogação de sessão, políticas de senha e recuperação segura.
- Autorização ABAC/RBAC no backend, escopo em queries e isolamento por produtor/evento; testes de acesso cruzado (IDOR).
- Criptografia de trânsito e repouso, gerenciamento de segredos, rotação de chaves, logs de acesso privilegiado.
- PII: CPF, e-mail e telefone mascarados nas listas; campos sensíveis protegidos na persistência quando aplicável; não incluir dados pessoais em mensagens de domínio.
- LGPD: finalidade, minimização, controle de acesso, consentimentos **quando essa for a base legal apropriada**, retenção/eliminação conforme obrigações, direitos de titulares, registro de exportações; consentimento de marketing não é inferido da compra.
- Meios de pagamento: armazenar tokens e referências do gateway, **não armazenar número completo de cartão/CVV**; requisitos de PCI devem ser definidos com o provedor e escopo operacional.
- Segregação de ambientes; produções sem seed de usuário padrão, dados fictícios nem webhooks de sandbox.

## Auditoria e Governança
Cada `AuditRecord` precisa de: id, timestamp UTC, ator real, papel, sessão, IP/proxy confiável, ação canônica (ex.: `event.price.updated`), recurso/tipo/id, produtor/evento, resultado, justificativa, origem (app/API/worker), correlação, versão, valor anterior/novo com dados sensíveis mascarados, dispositivo, hash/encadeamento ou armazenamento WORM conforme exigência. Logs técnicos em serviço separado, com referência de correlação.

A central de auditoria deve oferecer: filtro por usuário, ação, produtor, evento, período e resultado; exportação controlada; detecção de atos atípicos; trilha completa de aprovação; acesso histórico imutável; documentação de retenção e política de exclusão conforme norma aplicável.

## Fluxos de aprovação
- **Evento:** produtor/comercial solicita → validação cadastral → aprovação comercial da taxa → aprovação operacional → publicação.
- **Cortesia excepcional / preços:** solicitar → análise e aprovação no nível de autoridade → execução → histórico.
- **Estorno:** SAC/Operação abre → sistema verifica elegibilidade/valores → Financeiro analisa/aprova → execução pelo provedor → confirmação/conciliação; políticas mais restritivas podem exigir segundo aprovador.
- **Repasse e antecipação:** produtor solicita → Financeiro avalia, aprova ou rejeita → assinatura digital do produtor → **assinatura final do Financeiro Disk** → programação bancária e confirmação. A assinatura deve usar provedor/solução com evidências adequadas; registrar versões do documento e signatários.
- **Transferência entre eventos:** dentro das regras do mesmo produtor/contrato, exige aprovação Financeiro Disk e lançamentos compensatórios auditáveis.

## SAC com SLA e práticas ITIL
Classificar casos como `Solicitação`, `Incidente`, `Problema`, `Mudança`, `Reclamação` e `Estorno`. Definir severidade/impacto/urgência e SLAs por categoria/canal, calendário comercial/feriados e acordos. Medir `primeira resposta`, `resolução`, `reabertura`, `breach` e `CSAT`. Incidente crítico (ex.: venda indisponível) precisa de responsável, comunicação, linha do tempo, causa raiz e ação corretiva. **ITIL é modelo de práticas, não tecnologia que basta instalar.**
