import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PersistentEventBus } from '../runtime/persistent-runtime.mjs';
import {
  captureFirstPartyEventPreprod,
  listCapturedFirstPartyEvents,
  FIRST_PARTY_EVENT_CAPTURE_CORE_V0_CONTRACT
} from '../runtime/first-party-event-capture-core-v0.mjs';

function tmpFile(name = 'events.v8journal') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-evt74-'));
  return path.join(dir, name);
}

const ctx = Object.freeze({ company_id: 'fenix', engine_id: 'EVT-001', environment: 'PREPROD', version: '0.1.0' });
const baseEvent = Object.freeze({
  ...ctx,
  event_type: 'PAGE_VIEW',
  occurred_at: '2026-10-18T12:00:00Z',
  page_url: 'https://fenixcapital.es/hipotecas/?utm_source=test#top',
  page_category: 'SERVICE',
  consent_state: 'GRANTED_ANALYTICS',
  evidence_ref: 'fixture:evt74:1',
  account_id: 'acct-fixture-1',
  company_domain: 'example.test'
});

test('EVT-74 persists one privacy-minimized normalized first-party event in the existing PREPROD event journal', () => {
  const file = tmpFile();
  const out = captureFirstPartyEventPreprod({ event_input: baseEvent, file_path: file });
  assert.equal(out.status, 'CAPTURED_PREPROD');
  assert.equal(out.persistence_status, 'PERSISTED_LOCAL_ATOMIC_JOURNAL');
  assert.equal(out.operation_count, 1);
  assert.equal(out.prod_authorized, false);
  assert.equal(out.prod_write_authorized, false);
  assert.equal(out.additional_cost_eur, 0);
  const rows = listCapturedFirstPartyEvents({ file_path: file, context: ctx });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, 'FIRST_PARTY_EVENT_CAPTURED_V0');
  assert.equal(rows[0].payload.page_url_origin, 'https://fenixcapital.es');
  assert.equal(rows[0].payload.route_path, '/hipotecas/');
  assert.equal(rows[0].payload.raw_ip_stored, false);
  assert.equal(rows[0].payload.form_values_stored, false);
  assert.equal(rows[0].payload.device_fingerprint_stored, false);
});

test('EVT-74 is idempotent across process-style reopen and does not append duplicate events', () => {
  const file = tmpFile();
  const first = captureFirstPartyEventPreprod({ event_input: baseEvent, file_path: file });
  const second = captureFirstPartyEventPreprod({ event_input: baseEvent, file_path: file });
  assert.equal(first.status, 'CAPTURED_PREPROD');
  assert.equal(second.status, 'DUPLICATE_NOOP');
  assert.equal(second.operation_count, 1);
  const reopened = new PersistentEventBus({ file_path: file, environment: 'PREPROD' });
  assert.equal(reopened.operation_count, 1);
  assert.equal(reopened.listForContext(ctx).length, 1);
});

test('EVT-74 fails closed on consent, PROD, non-EVT scope and forbidden direct identifiers without persistence', () => {
  const consentFile = tmpFile('consent.v8journal');
  const noConsent = captureFirstPartyEventPreprod({ event_input: { ...baseEvent, consent_state: 'UNKNOWN' }, file_path: consentFile });
  assert.equal(noConsent.status, 'HOLD');
  assert.equal(noConsent.reason, 'ANALYTICS_CONSENT_REQUIRED');
  assert.equal(noConsent.persistence_status, 'NOT_PERSISTED');
  assert.equal(fs.existsSync(consentFile), false);

  const prodFile = tmpFile('prod.v8journal');
  const prod = captureFirstPartyEventPreprod({ event_input: { ...baseEvent, environment: 'PROD' }, file_path: prodFile });
  assert.equal(prod.status, 'BLOCKED');
  assert.equal(prod.reason, 'PROD_EVENT_CAPTURE_NOT_AUTHORIZED');
  assert.equal(fs.existsSync(prodFile), false);

  const wrongEngineFile = tmpFile('scope.v8journal');
  const wrongEngine = captureFirstPartyEventPreprod({ event_input: { ...baseEvent, engine_id: 'LEAD-001' }, file_path: wrongEngineFile });
  assert.equal(wrongEngine.status, 'BLOCKED');
  assert.equal(wrongEngine.reason, 'FIRST_PARTY_CAPTURE_ENGINE_SCOPE_MISMATCH');
  assert.equal(fs.existsSync(wrongEngineFile), false);

  assert.throws(
    () => captureFirstPartyEventPreprod({ event_input: { ...baseEvent, email: 'person@example.test' }, file_path: tmpFile('pii.v8journal') }),
    /forbidden event field/
  );
});

test('EVT-74 keeps company contexts isolated in the shared existing event runtime', () => {
  const file = tmpFile();
  const otherCtx = { company_id: 'company-b', engine_id: 'EVT-001', environment: 'PREPROD', version: '0.1.0' };
  captureFirstPartyEventPreprod({ event_input: baseEvent, file_path: file });
  captureFirstPartyEventPreprod({
    event_input: { ...baseEvent, ...otherCtx, evidence_ref: 'fixture:evt74:2', account_id: 'acct-fixture-2' },
    file_path: file
  });
  assert.equal(listCapturedFirstPartyEvents({ file_path: file, context: ctx }).length, 1);
  assert.equal(listCapturedFirstPartyEvents({ file_path: file, context: otherCtx }).length, 1);
});

test('EVT-74 contract reuses existing EVT persistence, stays zero-cost and leaves physical source binding closed', () => {
  const c = FIRST_PARTY_EVENT_CAPTURE_CORE_V0_CONTRACT;
  assert.equal(c.engine_id, 'EVT-001');
  assert.equal(c.environment, 'PREPROD');
  assert.equal(c.persistence, 'EXISTING_PERSISTENT_EVT001_LOCAL_ATOMIC_V8_JOURNAL');
  assert.equal(c.supabase_required, false);
  assert.equal(c.external_provider_required, false);
  assert.equal(c.website_tag_deployed, false);
  assert.equal(c.physical_source_bound, false);
  assert.equal(c.prod_authorized, false);
  assert.equal(c.prod_write_authorized, false);
  assert.equal(c.customer_data_authorized, false);
  assert.equal(c.trading_access, false);
  assert.equal(c.additional_cost_target_eur, 0);
});
