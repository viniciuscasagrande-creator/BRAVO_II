import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Pacote 02 — Domínio P06 implementa EVT-001, EVT-002, LOT-001, MAP-001 e MAP-002', () => {
  const domainSrc = read('packages/domain-p06/src/index.ts');
  for (const fn of [
    'isPubliclyVisibleEventStatus',
    'mapAreaToCanonicalApprovalStep',
    'calculateLotAvailability',
    'evaluateLotProgression',
    'generateNumberedRowSeats',
    'assertCanDeleteSector',
  ]) {
    assert.ok(domainSrc.includes(`export function ${fn}`), `Função de domínio ausente: ${fn}`);
  }
  assert.ok(domainSrc.includes('publiclyVisible'), 'publicEventProjection deve informar publiclyVisible (EVT-002)');
  assert.ok(domainSrc.includes('SETOR_COM_VENDAS_OU_RESERVAS'), 'Proteção contra exclusão de setor comprometido (MAP-002)');
});

test('Pacote 02 — Controller e Service expõem contratos de produtor, filas numeradas, duplicação de mapa, disponibilidade e virada de lote', () => {
  const controller = read('apps/api/src/modules/pacote06/pacote06.controller.ts');
  const service = read('apps/api/src/modules/pacote06/pacote06.service.ts');

  for (const route of [
    'comercial/produtores/:id/contratos',
    'comercial/produtores/:id/contatos',
    'eventos/:id/areas/:areaId/filas',
    'eventos/:id/areas/:areaId/duplicar',
    'eventos/:id/areas/:areaId/excluir',
    'eventos/:id/disponibilidade',
    'eventos/:id/lotes/processar-virada',
  ]) {
    assert.ok(controller.includes(route), `Rota ausente no Pacote06Controller: ${route}`);
  }

  for (const auditAction of [
    'PRODUCER_CONTRACT_CREATED',
    'PRODUCER_CONTACT_ADDED',
    'EVENT_SEAT_ROW_GENERATED',
    'EVENT_AREA_DUPLICATED',
    'EVENT_AREA_DELETED',
    'EVENT_LOT_PROGRESSION_PROCESSED',
  ]) {
    assert.ok(service.includes(auditAction), `Ação auditável ausente no Pacote06Service: ${auditAction}`);
  }
});

test('Pacote 02 — UI de Produtor e Event Builder integram Contratos, Construtor de Filas Numeradas, Virada de Lote e Visibilidade Pública', () => {
  const prodUi = read('apps/backoffice/src/app/comercial/produtores/[id]/produtor-detalhe-client.tsx');
  const evtUi = read('apps/backoffice/src/app/eventos/[id]/evento-detalhe-client.tsx');

  assert.ok(prodUi.includes('Contratos comerciais'), 'Painel de contratos comerciais ausente na UI de produtor');
  assert.ok(prodUi.includes('Contatos corporativos e financeiros'), 'Painel de contatos ausente na UI de produtor');

  assert.ok(evtUi.includes('Construtor de filas e poltronas numeradas (MAP-001)'), 'Construtor de filas ausente no Event Builder');
  assert.ok(evtUi.includes('Processar virada automática de lote (LOT-001)'), 'Botão de virada de lote ausente no Event Builder');
  assert.ok(evtUi.includes('Ocorrências, adiamento e visibilidade pública (EVT-002)'), 'Painel de ocorrências/visibilidade ausente no Event Builder');
});
