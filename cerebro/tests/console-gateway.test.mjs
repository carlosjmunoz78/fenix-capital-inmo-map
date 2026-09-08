import test from 'node:test';
import assert from 'node:assert/strict';
import { CerebroGatewayV0, getConsoleRegistry } from '../console/gateway.mjs';

const IDS = ['CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001'];

test('Console V0 registry covers exactly the five canonical Phase 5 engines', () => {
  const registry = getConsoleRegistry();
  assert.deepEqual(new Set(registry.engines.map(e => e.engine_id)), new Set(IDS));
  assert.equal(registry.environment, 'PREPROD');
  assert.equal(registry.direct_model_access, false);
  assert.equal(registry.policy.gateway_required, true);
  assert.equal(registry.policy.supabase_writes, false);
  assert.equal(registry.additional_cost_target_eur, 0);
});

test('Console V0 refuses every environment except exact PREPROD', () => {
  for (const environment of ['PROD','prod','PRODUCTION','DEV','preprod']) {
    assert.throws(() => new CerebroGatewayV0({ environment }), /PREPROD/);
  }
  assert.equal(new CerebroGatewayV0().environment, 'PREPROD');
});

test('session context is company-bound and cross-company switching is denied', () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a' });
  assert.equal(gateway.inspectSession('s1').context.company_id, 'company-a');
  assert.throws(() => gateway.selectContext({ session_id: 's1', company_id: 'company-b', engine_id: 'CTX-001' }), /cross-company/);
  const ctx = gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CTX-001' });
  assert.equal(ctx.engine_id, 'CTX-001');
});

test('commands execute only through gateway and preserve exact context', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('PING', ({ context, payload }) => ({ status: 'OK', company_id: context.company_id, echoed: payload.value }));
  const result = await gateway.execute({ session_id: 's1', command: 'PING', payload: { value: 7 } });
  assert.deepEqual(result, { status: 'OK', company_id: 'company-a', echoed: 7 });
  const session = gateway.inspectSession('s1');
  assert.equal(session.history.length, 1);
  assert.equal(session.history[0].kind, 'COMMAND');
});

test('unknown command and unavailable chat fail closed to canonical HUMAN_REQUIRED', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a' });
  const commandResult = await gateway.execute({ session_id: 's1', command: 'MISSING' });
  assert.equal(commandResult.status, 'HUMAN_REQUIRED');
  assert.equal(commandResult.reason, 'LOW_CONFIDENCE');
  const chatResult = await gateway.chat({ session_id: 's1', message: 'hola' });
  assert.equal(chatResult.status, 'HUMAN_REQUIRED');
  assert.equal(chatResult.reason, 'LOW_CONFIDENCE');
});

test('chat adapter is gateway-mediated and cannot claim noncanonical HUMAN_REQUIRED', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CHAT-001' } });
  gateway.setChatAdapter(({ context, message }) => ({ status: 'OK', via: 'gateway', company_id: context.company_id, message }));
  const result = await gateway.chat({ session_id: 's1', message: 'estado' });
  assert.equal(result.via, 'gateway');
  assert.equal(result.company_id, 'company-a');

  gateway.setChatAdapter(() => ({ status: 'HUMAN_REQUIRED', reason: 'OTHER' }));
  await assert.rejects(() => gateway.chat({ session_id: 's1', message: 'x' }), /invalid HUMAN_REQUIRED/);
});

test('contract stays read-only reference: no PROD, Supabase writes, trading or direct model access', () => {
  const gateway = new CerebroGatewayV0();
  const contract = gateway.contract();
  assert.equal(contract.prod_execution_enabled, false);
  assert.equal(contract.supabase_writes, false);
  assert.equal(contract.live_writes, false);
  assert.equal(contract.autonomous_prod, false);
  assert.equal(contract.trading_access, false);
  assert.equal(contract.direct_model_access, false);
  assert.equal(contract.additional_cost_target_eur, 0);
  assert.deepEqual(new Set(contract.engines), new Set(IDS));
});
