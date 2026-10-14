import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HUMAN_REQUIRED_REASONS,
  VOICE_SCENARIOS,
  buildLocalAudioPipeline,
  buildVoiceTelemetry,
  createVoiceExecutionLedger,
  evaluateVoiceGate,
  redactVoiceText,
  routeVoiceScenario
} from '../voice/voice001-outreach-runtime-v0.mjs';

const context = Object.freeze({ company_id: 'fenix', engine_id: 'VOICE-001', environment: 'PREPROD', version: '0.1.0' });
const base = Object.freeze({
  context,
  request_id: 'voice-test-001',
  scenario: 'LEAD_RESCUE',
  direction: 'OUTBOUND',
  contact_consent: 'EXPLICIT',
  opted_out: false,
  recording_requested: false,
  crm_write_requested: false,
  transport_mode: 'SIMULATION',
  provider: 'LOCAL',
  pipeline: 'LOCAL_STT_TTS',
  confidence: 0.95
});

function expectBlocked(input, code, reason) {
  const result = evaluateVoiceGate({ ...base, ...input });
  assert.equal(result.allowed, false);
  assert.equal(result.code, code);
  assert.equal(result.human_required_reason, reason);
  assert.equal(result.external_side_effect_executed, false);
}

test('safe local PREPROD simulation is allowed with all side effects off', () => {
  const result = routeVoiceScenario(base);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'SIMULATION_ALLOWED');
  assert.equal(result.plan.stt_adapter, 'FASTER_WHISPER_LOCAL');
  assert.equal(result.plan.tts_adapter, 'PIPER_LOCAL');
  assert.equal(result.plan.real_call_authorized, false);
  assert.equal(result.plan.crm_write_authorized, false);
  assert.equal(result.plan.recording_enabled, false);
  assert.equal(result.plan.external_side_effect_executed, false);
});

test('real call is fail-closed', () => expectBlocked({ transport_mode: 'REAL_CALL' }, 'REAL_CALL_DISABLED', 'HIGH_RISK'));
test('recording is fail-closed', () => expectBlocked({ recording_requested: true }, 'RECORDING_DISABLED', 'LEGAL_REQUIRED'));
test('CRM writes are fail-closed', () => expectBlocked({ crm_write_requested: true }, 'CRM_WRITE_DISABLED', 'POLICY_CONFLICT'));
test('missing outbound consent is fail-closed', () => expectBlocked({ contact_consent: 'UNKNOWN' }, 'OUTBOUND_CONSENT_REQUIRED', 'LEGAL_REQUIRED'));
test('opt-out suppresses contact', () => expectBlocked({ opted_out: true }, 'CONTACT_SUPPRESSED', 'POLICY_CONFLICT'));

test('cross-company request is denied', () => expectBlocked({ target_company_id: 'other-company' }, 'COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT'));

test('Retell and Dapta remain HOLD commercial', () => {
  for (const provider of ['RETELL','DAPTA']) {
    const result = evaluateVoiceGate({ ...base, provider });
    assert.equal(result.allowed, false);
    assert.equal(result.code, `${provider}_COMMERCIAL_HOLD`);
    assert.equal(result.provider_status, 'HOLD_COMMERCIAL');
  }
});

test('local STT/TTS pipeline is plan-only and zero-cost', () => {
  const result = buildLocalAudioPipeline(base);
  assert.equal(result.allowed, true);
  assert.equal(result.stt.adapter, 'faster-whisper');
  assert.equal(result.tts.adapter, 'piper');
  assert.equal(result.executes_external_process, false);
  assert.equal(result.executes_network_call, false);
  assert.equal(result.stt.additional_cost_eur, 0);
  assert.equal(result.tts.additional_cost_eur, 0);
});

test('all blocks 111-117 scenarios route through VOICE-001 without dispatch', () => {
  for (const scenario of VOICE_SCENARIOS) {
    const direction = scenario === 'INBOUND_QUALIFICATION' ? 'INBOUND' : 'OUTBOUND';
    const result = routeVoiceScenario({ ...base, scenario, direction });
    assert.equal(result.allowed, true, scenario);
    assert.equal(result.plan.engine_id, 'VOICE-001');
    assert.ok(result.plan.dependencies.includes('SALE-001'), scenario);
    assert.ok(result.plan.dependencies.includes('COM-001'), scenario);
    assert.equal(result.plan.delivery_dispatch_authorized, false);
  }
});

test('idempotency suppresses duplicate and rejects key reuse with changed scope', () => {
  const ledger = createVoiceExecutionLedger();
  const first = ledger.execute(base);
  const duplicate = ledger.execute(base);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(ledger.size(), 1);

  const conflict = ledger.execute({ ...base, pipeline: 'PIPECAT_SIMULATION' });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(ledger.size(), 1);
});

test('PII redactor masks common phone, email, ID and IBAN forms', () => {
  const input = 'ana@example.com +34 612 345 678 12345678Z ES12 1234 1234 1234 1234 1234 1234';
  const out = redactVoiceText(input);
  assert.equal(out.includes('ana@example.com'), false);
  assert.equal(out.includes('612 345 678'), false);
  assert.equal(out.includes('12345678Z'), false);
  assert.equal(out.includes('ES12 1234'), false);
  assert.match(out, /REDACTED_EMAIL/);
  assert.match(out, /REDACTED_PHONE/);
  assert.match(out, /REDACTED_ID/);
  assert.match(out, /REDACTED_IBAN/);
});

test('raw PII/media keys are rejected before state creation', () => {
  assert.throws(() => evaluateVoiceGate({ ...base, phone: '+34612345678' }), /PII\/secret\/raw-media field forbidden/);
  assert.throws(() => evaluateVoiceGate({ ...base, transcript: 'raw words' }), /PII\/secret\/raw-media field forbidden/);
});

test('only canonical HUMAN_REQUIRED reasons are emitted', () => {
  assert.deepEqual(HUMAN_REQUIRED_REASONS, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
  expectBlocked({ confidence: 0.4 }, 'LOW_CONFIDENCE', 'LOW_CONFIDENCE');
  expectBlocked({ high_risk: true }, 'HIGH_RISK_CASE', 'HIGH_RISK');
  expectBlocked({ money_limit_exceeded: true }, 'MONEY_LIMIT_EXCEEDED', 'MONEY_LIMIT');
  expectBlocked({ customer_human_request: true }, 'CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST');
});

test('PROD cannot enter the outreach runtime', () => {
  assert.throws(() => evaluateVoiceGate({ ...base, context: { ...context, environment: 'PROD' } }), /exact PREPROD only/);
});

test('telemetry stores hashes/metadata only, never transcript/audio/PII', () => {
  const telemetry = buildVoiceTelemetry(base);
  assert.equal(telemetry.raw_transcript_persisted, false);
  assert.equal(telemetry.raw_audio_persisted, false);
  assert.equal(telemetry.pii_persisted, false);
  assert.equal(telemetry.external_side_effect_executed, false);
});
