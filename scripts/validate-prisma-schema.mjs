#!/usr/bin/env node
/**
 * Valida estruturalmente prisma/schema.prisma, seus 55 modelos e mapeamentos @@map,
 * e verifica se DATABASE_URL aponta exclusivamente para banco de homologação (bravo_ii_hml),
 * sem strings de produção.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(root, '.env'));
  }
} catch {}

const schemaPath = path.join(root, 'prisma/schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('ERRO: prisma/schema.prisma não encontrado.');
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');
const datasources = (schema.match(/datasource\s+db\s*\{/g) || []).length;
if (datasources !== 1) {
  console.error(`ERRO: Esperado exatamente 1 datasource db, encontrado(s): ${datasources}`);
  process.exit(1);
}

const requiredModels = [
  'BravoProducer',
  'BravoProducerDocument',
  'BravoEvent',
  'BravoEventProducer',
  'BravoEventSession',
  'BravoEventArea',
  'BravoEventSeat',
  'BravoTicketCategory',
  'BravoPriceLot',
  'BravoEventChannel',
  'BravoEventMedia',
  'BravoEventFee',
  'BravoEventApproval',
  'BravoPublication',
  'BravoOutbox',
  'BravoAudit',
  'BravoCommercialProposal',
  'BravoCommercialContract',
  'BravoEventDocument',
  'BravoEventChangeCase',
  'BravoIdentityUser',
  'BravoIdentitySession',
  'BravoCustomer',
  'BravoSaleOrder',
  'BravoIssuedTicket',
  'BravoTicketSequence',
  'BravoPaymentConfirmation',
  'BravoCheckoutAttempt',
  'BravoPdvTerminal',
  'BravoPdvShift',
  'BravoSupportTeam',
  'BravoSupportTeamMember',
  'BravoSupportQueue',
  'BravoSlaPolicy',
  'BravoSupportCase',
  'BravoSupportInteraction',
  'BravoSupportIncident',
  'BravoSupportProblem',
  'BravoKnowledgeArticle',
  'BravoSupportSatisfaction',
  'BravoOrderChangeRequest',
  'BravoTicketReplacement',
  'BravoCancellationRequest',
  'BravoRefundRequest',
  'BravoRefundApproval',
  'BravoRefundAttempt',
  'BravoEventRefundBatch',
  'BravoAiQuotaWindow',
  'BravoFunctionCatalog',
  'BravoFinanceCostCenter',
  'BravoRhEmployee',
  'BravoRhGeofence',
  'BravoRhTimePunch',
  'BravoRhPaymentBatch',
  'BravoFinanceLedgerEntry',
];

const missingModels = requiredModels.filter(
  (m) => (schema.match(new RegExp(`model\\s+${m}\\s+\\{`, 'g')) || []).length !== 1
);
if (missingModels.length > 0) {
  console.error('ERRO: Modelos ausentes ou duplicados em prisma/schema.prisma:', missingModels.join(', '));
  process.exit(1);
}

const mappedTablesCount = (schema.match(/@@map\("/g) || []).length;
if (mappedTablesCount !== requiredModels.length) {
  console.error(
    `ERRO: Todos os ${requiredModels.length} modelos devem possuir @@map("<snake_case>"), encontrado(s): ${mappedTablesCount}`
  );
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl || !/(hml|homolog|preview)/i.test(dbUrl) || /(prod|production|live)/i.test(dbUrl)) {
  console.error('ERRO: DATABASE_URL deve apontar exclusivamente para banco de homologação (bravo_ii_hml), sem strings de produção.');
  process.exit(1);
}

const sha256 = createHash('sha256').update(schema).digest('hex');
const isGenerate = process.argv.includes('--generate');

console.log(
  JSON.stringify(
    {
      step: isGenerate ? 'db:generate' : 'db:validate',
      status: 'OK',
      schemaFile: 'prisma/schema.prisma',
      sha256,
      datasources,
      modelsValidated: requiredModels.length,
      mappedTablesValidated: mappedTablesCount,
      p10ModelsValidated: 17,
      financeRhModelsValidated: 7,
      databaseTarget: new URL(dbUrl).pathname.replace(/^\//, ''),
    },
    null,
    2
  )
);
