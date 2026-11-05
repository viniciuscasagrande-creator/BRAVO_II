# Testes executáveis

Na raiz BRAVO_II_FINANCEIRO_RH (Node.js 20+ recomendado):

```powershell
# Fluxos referenciais já existentes no backup (execução isolada)
cd referencias/FONTE_ORIGINAL_FINANCEIRO_RH
npm test
npm run build
cd RH_DISK_V1
npm test

# Na raiz do pacote BRAVO_II
node --test 05-PREVIEW/tests/*.test.mjs
node --test 04-INTEGRACAO/tests/*.test.mjs
cd 05-PREVIEW
node server.mjs
# Abra http://localhost:4173
```

Estes comandos validam somente integridade de frontend/contratos de referência e sua renderização; testes de produção do BRAVO_II exigirão banco PostgreSQL, NestJS, integração sandbox e testes e2e independentes.
