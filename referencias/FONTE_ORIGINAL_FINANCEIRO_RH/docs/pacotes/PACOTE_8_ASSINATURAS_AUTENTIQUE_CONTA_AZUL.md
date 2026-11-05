# Módulo Financeiro V1 — Pacote 8
## Assinaturas Digitais, Autentique e Conta Azul

### Objetivo
Adicionar ao ambiente **Financeiro Disk** uma central operacional de assinaturas digitais e integrações, mantendo o **Autentique** como provedor de assinatura e preparando a integração ERP com **Conta Azul**.

### Regras preservadas
- Dois ambientes independentes: Produtor e Financeiro Disk.
- Produtor visualiza/assina apenas documentos vinculados às próprias operações.
- Financeiro Disk administra a central completa.
- Ordem obrigatória: **Produtor assina primeiro; Financeiro Disk assina por último**.
- Autentique é provedor externo; o Financeiro V1 mantém o workflow e o status interno.
- Conta Azul não substitui Core, Ledger, saldo por evento, MDR, repasses ou workflows.
- Nenhuma falha de integração pode ser convertida em sucesso local silencioso.
- Tokens, client secrets e credenciais ficam somente no backend.

### Menu implantado
**Assinaturas e Integrações**
- Central de Assinaturas
- Documentos
- Autentique
- Conta Azul
- Sincronizações
- Logs de Integração

### Autentique
Preparado para:
- criação de documentos;
- signatários;
- ordem de assinatura;
- status interno normalizado;
- webhooks;
- homologação/produção;
- logs e auditoria.

### Conta Azul
Preparado para:
- OAuth 2.0;
- mapeamento de dados;
- clientes/produtores;
- fornecedores;
- contas a pagar;
- contas a receber;
- confirmação de pagamentos após conciliação;
- fila de sincronização;
- divergências, erros e reprocessamento.

### Estados de sincronização
- PENDENTE
- PROCESSANDO
- SINCRONIZADO
- DIVERGENTE
- ERRO
- AGUARDANDO_REPROCESSAMENTO

### Produção
Este pacote prepara UI, navegação, regras e contratos de integração. Credenciais reais e chamadas externas devem ser ativadas no backend em homologação, nunca diretamente no frontend.
