import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyExecutionPlacementV1, EXECUTION_PLACEMENT_POLICY_V1_CONTRACT } from '../runtime/execution-placement-policy-v1.mjs';

const CTX = Object.freeze({ company_id: 'fenix', engine_id: 'JOB-001', environment: 'PREPROD', version: 'placement-v1-test' });
const EDGE_ONLINE = Object.freeze({ online: true, paired: true, transport_online: true, device_id: 'edge-test-1' });
const EDGE_OFFLINE = Object.freeze({ online: false, paired: false, transport_online: false, device_id: null });

test('hostless work continues when the PC/edge runner is offline', () => {
  const result = classifyExecutionPlacementV1({ context: CTX, required_capabilities: [], edge_status: EDGE_OFFLINE });
  assert.equal(result.placement, 'HOSTLESS');
  assert.equal(result.runnable, true);
  assert.equal(result.deferred, false);
  assert.equal(result.edge_required, false);
  assert.equal(result.edge_status, 'EDGE_OFFLINE_OPTIONAL');
  assert.equal(result.human_required, false);
  assert.equal(result.additional_cost_eur, 0);
});

test('device-required work is deferred, not escalated to human, when edge is offline', () => {
  const result = classifyExecutionPlacementV1({ context: CTX, required_capabilities: ['DEVICE_REQUIRED'], edge_status: EDGE_OFFLINE });
  assert.equal(result.placement, 'DEFERRED_EDGE');
  assert.equal(result.runnable, false);
  assert.equal(result.deferred, true);
  assert.equal(result.edge_required, true);
  assert.equal(result.edge_status, 'EDGE_OFFLINE');
  assert.equal(result.human_required, false);
  assert.equal(result.human_required_reason, null);
});

test('device-required work resumes automatically when the edge runner is ready', () => {
  const result = classifyExecutionPlacementV1({ context: CTX, required_capabilities: ['LOCAL_BROWSER_SESSION'], edge_status: EDGE_ONLINE });
  assert.equal(result.placement, 'EDGE');
  assert.equal(result.runnable, true);
  assert.equal(result.deferred, false);
  assert.equal(result.edge_status, 'EDGE_READY');
  assert.equal(result.reason, 'DEVICE_REQUIRED_EDGE_READY');
});

test('offline edge never changes hostless work into HUMAN_REQUIRED', () => {
  const result = classifyExecutionPlacementV1({ context: CTX, required_capabilities: ['NETWORK_RESEARCH'], edge_status: EDGE_OFFLINE });
  assert.equal(result.placement, 'HOSTLESS');
  assert.equal(result.human_required, false);
  assert.equal(result.reason, 'HOSTLESS_CONTINUES_EDGE_OFFLINE');
});

test('placement stays PREPROD-only and Trading-denied', () => {
  assert.throws(() => classifyExecutionPlacementV1({ context: { ...CTX, environment: 'PROD' } }), /PREPROD_ONLY/);
  assert.throws(() => classifyExecutionPlacementV1({ context: { ...CTX, engine_id: 'TRADING-LAB' } }), /TRADING_DENIED/);
});

test('contract pins PC as optional edge runner and adds no runtime infrastructure', () => {
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.default_placement, 'HOSTLESS');
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.edge_is_optional_by_default, true);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.edge_offline_is_global_failure, false);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.edge_offline_is_human_required, false);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.new_queue_created, false);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.new_scheduler_created, false);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.new_daemon_created, false);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.additional_cost_eur, 0);
  assert.equal(EXECUTION_PLACEMENT_POLICY_V1_CONTRACT.prod_authorized, false);
});
