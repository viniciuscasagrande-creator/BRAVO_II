import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { campaignLink } from '../apps/backoffice/src/components/producer-portal/marketing.mjs';

test('preserva parâmetros de compra e codifica a campanha', () => {
  const url = new URL(
    campaignLink(
      'https://example.org/evento?lote=2&utm_source=antiga',
      'instagram',
      'social',
      'Show & verão',
      'event-a'
    )
  );
  assert.equal(url.searchParams.get('lote'), '2');
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.get('utm_campaign'), 'Show & verão');
  assert.equal(url.searchParams.get('utm_content'), 'event-a');
});

test('rejeita protocolos inseguros e credenciais no link', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://example.org',
    'https://user:pass@example.org',
  ]) {
    assert.throws(() => campaignLink(url, 'a', 'b', 'c', 'e'));
  }
});

test('não permite campanha vazia ou fora do limite', () => {
  for (const value of [' ', 'a'.repeat(121)]) {
    assert.throws(() => campaignLink('https://example.org', value, 'b', 'c', 'e'));
  }
});

test('Portal do Produtor (Incrementos 01 e 02) protege escopo, oculta Taxa Disk interna e conecta repasses/assinaturas/marketing', () => {
  const shell = readFileSync('apps/backoffice/src/components/bravo-shell.tsx', 'utf8');
  assert.match(shell, /pathname === '\/produtores-pdt'/);

  const portal = readFileSync(
    'apps/backoffice/src/components/producer-portal/portal.tsx',
    'utf8'
  );
  assert.match(portal, /vendasRealizadasBrutoCents/);
  assert.match(portal, /valoresCreditadosProdutorCents/);
  assert.match(portal, /retencoesPreEventoCents/);
  assert.match(portal, /saldoDisponivelParaRepasseCents/);
  assert.match(portal, /portal\/repasses/);
  assert.match(portal, /assinar/);
  assert(!portal.includes('internalDiskFeeAgreement'));

  const eventsService = readFileSync(
    'apps/api/src/modules/events/events.service.ts',
    'utf8'
  );
  assert.match(eventsService, /getProducerEventPortal/);
  assert.match(eventsService, /requestProducerPayout/);
  assert.match(eventsService, /signProducerPayout/);
  assert.match(eventsService, /CROSS_EVENT_SCOPE_FORBIDDEN/);
});
