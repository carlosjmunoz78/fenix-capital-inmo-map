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

test('Console environment and version are immutable after construction', () => {
  const gateway = new CerebroGatewayV0({ environment: 'PREPROD', version: '0.1.0' });
  assert.throws(() => { gateway.environment = 'PROD'; }, TypeError);
  assert.throws(() => { gateway.version = '9.9.9'; }, TypeError);
  assert.equal(gateway.environment, 'PREPROD');
  assert.equal(gateway.version, '0.1.0');
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

test('nested shared-memory command payload is rejected before handler/history mutation', async () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  let called = false;
  gateway.registerCommand('SAFE', () => { called = true; return { status: 'OK' }; });
  const shared = new Uint8Array(new SharedArrayBuffer(8));
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'SAFE', payload: { nested: { shared } } }), /shared memory/i);
  assert.equal(called, false);
  assert.equal(gateway.inspectSession('s1').history.length, 0);
  assert.equal(gateway.auditLog().filter(e => e.type === 'COMMAND_EXECUTED').length, 0);
});

test('unsafe command results are rejected atomically before success history/audit', async () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('BAD', () => ({ status: 'OK', nested: { bytes: new Uint8Array(new SharedArrayBuffer(8)) } }));
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'BAD' }), /shared memory/i);
  assert.equal(gateway.inspectSession('s1').history.length, 0);
  assert.equal(gateway.auditLog().filter(e => e.type === 'COMMAND_EXECUTED').length, 0);
});

test('nested WebAssembly.Memory is rejected in payload and adapter result', async () => {
  if (typeof WebAssembly === 'undefined' || typeof WebAssembly.Memory !== 'function') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('WASM', () => ({ status: 'OK' }));
  const memory = new WebAssembly.Memory({ initial: 1 });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'WASM', payload: { nested: memory } }), /WebAssembly\.Memory/);
  assert.equal(gateway.inspectSession('s1').history.length, 0);

  gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CHAT-001' });
  gateway.setChatAdapter(() => ({ status: 'OK', nested: memory }));
  await assert.rejects(() => gateway.chat({ session_id: 's1', message: 'x' }), /WebAssembly\.Memory/);
  assert.equal(gateway.inspectSession('s1').history.length, 0);
});

test('accessor properties are rejected without invoking getters', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('ACCESSOR', () => ({ status: 'OK' }));
  let getterCalls = 0;
  const nested = {};
  Object.defineProperty(nested, 'secret', { enumerable: true, get() { getterCalls += 1; return 'x'; } });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'ACCESSOR', payload: { nested } }), /accessor/i);
  assert.equal(getterCalls, 0);
  assert.equal(gateway.inspectSession('s1').history.length, 0);
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
