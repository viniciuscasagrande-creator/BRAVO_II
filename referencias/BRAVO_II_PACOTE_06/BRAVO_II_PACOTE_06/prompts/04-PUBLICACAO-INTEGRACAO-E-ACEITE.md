# PROMPT 04 — Publicação segura e integração com financeiro, RH e PDT

Leia `docs/03-CONTRATO-COM-FINANCEIRO-RH-PDT.md`, `docs/06-CHECKLIST-ACEITE.md` e `integracao/eventos-integracao.json`.

- Validar todos os pré-requisitos de publicação no domínio e banco.
- Criar outbox idempotente e registrar `PUBLICACAO_SOLICITADA`/`PENDENTE_INTEGRACAO`.
- NÃO acionar o www.diskingressos.com.br até receber contrato de API oficial, credenciais de sandbox e autorização do operador.
- Worker deve validar recibo assinado/canal confiável e confirmar evento, nunca aceitar qualquer chamada HTTP pública para marcar evento como PUBLICADO.
- Public payload limitado: sem Taxa Disk, dados privados PJ, contratos internos ou custos RH.
- Integrar evento canônico ao catálogo de Financeiro Disk e RH sem clonar tabelas; preservação total das 149 funções do Pacote Mestre.
- Preparar interfaces futuras PDT/PDV sem alterar portal atual: isolamento produtor/evento nas APIs e no banco.
- Cenários de cancelamento/adiamento deverão abrir caso de gestão de mudanças com SAC/Financeiro e não iniciar estornos sozinhos.

Depois executar teste completo de `docs/06-CHECKLIST-ACEITE.md`, documentar bloqueios e entregar somente **Preview**. Produção depende de homologação expressa.
