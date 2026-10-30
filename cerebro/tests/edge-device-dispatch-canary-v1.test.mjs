import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('supabase/functions/cerebro-device-gateway-preprod-lean-canary/index.ts', 'utf8');
const workflow = fs.readFileSync('.github/workflows/cerebro-edge-device-dispatch-canary-v1.yml', 'utf8');

test('edge dispatch canary is PREPROD-only, OIDC-bound and reuses the existing durable device queue', () => {
  assert.match(source, /const PREPROD = "PREPROD"/);
  assert.match(source, /cerebro_device_commands_preprod/);
  assert.match(source, /cerebro_device_agents_preprod/);
  assert.match(source, /audience: AUDIENCE/);
  assert.match(source, /github_repository_denied/);
  assert.match(source, /github_ref_denied/);
  assert.match(source, /github_workflow_denied/);
  assert.match(source, /V9_PROXY_PLUS_OIDC_EDGE_PRODUCER_CANARY/);
  assert.match(source, /old_gateway_untouched: true/);
  assert.match(source, /existing_device_queue_reused: true/);
  assert.match(source, /no_new_queue: true/);
  assert.match(source, /no_new_scheduler: true/);
  assert.match(source, /no_new_daemon: true/);
  assert.match(source, /prod_allowed: false/);
  assert.match(source, /trading_access: false/);
  assert.match(source, /additional_cost_eur: 0/);
});

test('offline edge is queued and never escalated to human', () => {
  assert.match(source, /placement: ready \? "EDGE" : "DEFERRED_EDGE"/);
  assert.match(source, /queued_for_resume: !ready/);
  assert.match(source, /human_required: false/);
  assert.match(source, /state: "QUEUED"/);
  assert.match(source, /delivery_attempt/);
});

test('idempotency and secret guards are explicit', () => {
  assert.match(source, /edge_idempotency_conflict/);
  assert.match(source, /REUSED_AFTER_RACE/);
  assert.match(source, /payload_secret_key_forbidden/);
  assert.match(source, /payload_sha256/);
  assert.match(source, /23505/);
});

test('canary cleanup is synthetic-run scoped and cannot target normal devices', () => {
  assert.match(source, /const CANARY_DEVICE_PREFIX = "gh-edge-canary-"/);
  assert.match(source, /canaryDeviceId\(caller\.run_id\)/);
  assert.match(source, /synthetic-offline-canary-v1/);
  assert.doesNotMatch(source, /delete\(\).*\.neq\(/);
});

test('physical canary workflow uses GitHub OIDC and no repository secret', () => {
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /audience=cerebro-device-dispatch-v1/);
  assert.match(workflow, /canary-fixture/);
  assert.match(workflow, /v1\/control\/enqueue/);
  assert.match(workflow, /v1\/control\/status/);
  assert.match(workflow, /canary-cleanup/);
  assert.match(workflow, /delivery_attempt/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /cluhljgonannaafpmblx/);
});
