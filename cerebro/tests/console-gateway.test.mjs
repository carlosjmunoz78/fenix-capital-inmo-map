import test from 'node:test';
import assert from 'node:assert/strict';
import { CerebroGatewayV0, getConsoleRegistry } from '../console/gateway.mjs';

const IDS = ['CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001'];
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};

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
  for (const environment of ['PROD','prod','PRODUCTION','DEV','preprod']) assert.throws(() => new CerebroGatewayV0({ environment }), /PREPROD/);
  assert.equal(new CerebroGatewayV0().environment, 'PREPROD');
});

test('Console environment and version are immutable after construction', () => {
  const gateway = new CerebroGatewayV0({ environment: 'PREPROD', version: '0.1.0' });
  assert.throws(() => { gateway.environment = 'PROD'; }, TypeError);
  assert.throws(() => { gateway.version = '9.9.9'; }, TypeError);
  assert.equal(gateway.environment, 'PREPROD');
  assert.equal(gateway.version, '0.1.0');
});

test('session authoritative company/environment/version cannot be overridden through context', () => {
  const gateway = new CerebroGatewayV0({ version: '0.1.0' });
  gateway.createSession({
    session_id: 's1',
    company_id: 'company-a',
    context: { engine_id: 'CMD-001', company_id: 'company-b', environment: 'PROD', version: '9.9.9' }
  });
  const ctx = gateway.inspectSession('s1').context;
  assert.deepEqual(ctx, { company_id: 'company-a', engine_id: 'CMD-001', environment: 'PREPROD', version: '0.1.0' });
});

test('session context is company-bound and cross-company switching is denied', () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a' });
  assert.throws(() => gateway.selectContext({ session_id: 's1', company_id: 'company-b', engine_id: 'CTX-001' }), /cross-company/);
  assert.equal(gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CTX-001' }).engine_id, 'CTX-001');
});

test('commands execute only through gateway and preserve exact context', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('PING', ({ context, payload }) => ({ status: 'OK', company_id: context.company_id, echoed: payload.value }));
  assert.deepEqual(await gateway.execute({ session_id: 's1', command: 'PING', payload: { value: 7 } }), { status: 'OK', company_id: 'company-a', echoed: 7 });
  const entry = gateway.inspectSession('s1').history[0];
  assert.equal(entry.kind, 'COMMAND');
  assert.equal(entry.context.engine_id, 'CMD-001');
});

test('async command audit/history keep the operation context snapshot across context changes', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  const gate = deferred();
  gateway.registerCommand('WAIT', async ({ context }) => { await gate.promise; return { status: 'OK', engine_id: context.engine_id }; });
  const pending = gateway.execute({ session_id: 's1', command: 'WAIT' });
  gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CTX-001' });
  gate.resolve();
  const result = await pending;
  assert.equal(result.engine_id, 'CMD-001');
  const history = gateway.inspectSession('s1').history.find(e => e.kind === 'COMMAND');
  const audit = gateway.auditLog().find(e => e.type === 'COMMAND_EXECUTED');
  assert.equal(history.context.engine_id, 'CMD-001');
  assert.equal(audit.context.engine_id, 'CMD-001');
  assert.equal(gateway.inspectSession('s1').context.engine_id, 'CTX-001');
});

test('async chat audit/history keep the operation context snapshot across context changes', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CHAT-001' } });
  const gate = deferred();
  gateway.setChatAdapter(async ({ context }) => { await gate.promise; return { status: 'OK', engine_id: context.engine_id }; });
  const pending = gateway.chat({ session_id: 's1', message: 'wait' });
  gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CTX-001' });
  gate.resolve();
  assert.equal((await pending).engine_id, 'CHAT-001');
  assert.equal(gateway.inspectSession('s1').history.find(e => e.kind === 'CHAT').context.engine_id, 'CHAT-001');
  assert.equal(gateway.auditLog().find(e => e.type === 'CHAT_MEDIATED').context.engine_id, 'CHAT-001');
});

test('nested shared-memory command payload is rejected before handler and audited as error', async () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  let called = false;
  gateway.registerCommand('SAFE', () => { called = true; return { status: 'OK' }; });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'SAFE', payload: { nested: { shared: new Uint8Array(new SharedArrayBuffer(8)) } } }), /shared memory/i);
  assert.equal(called, false);
  assert.equal(gateway.inspectSession('s1').history.at(-1).kind, 'COMMAND_ERROR');
  assert.equal(gateway.auditLog().at(-1).type, 'COMMAND_ERROR');
  assert.equal(gateway.auditLog().filter(e => e.type === 'COMMAND_EXECUTED').length, 0);
});

test('unsafe command results are rejected before success and audited as error', async () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('BAD', () => ({ status: 'OK', nested: { bytes: new Uint8Array(new SharedArrayBuffer(8)) } }));
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'BAD' }), /shared memory/i);
  assert.equal(gateway.inspectSession('s1').history.at(-1).kind, 'COMMAND_ERROR');
  assert.equal(gateway.auditLog().at(-1).type, 'COMMAND_ERROR');
  assert.equal(gateway.auditLog().filter(e => e.type === 'COMMAND_EXECUTED').length, 0);
});

test('nested WebAssembly.Memory is rejected in payload and adapter result with error audit', async () => {
  if (typeof WebAssembly === 'undefined' || typeof WebAssembly.Memory !== 'function') return;
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('WASM', () => ({ status: 'OK' }));
  const memory = new WebAssembly.Memory({ initial: 1 });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'WASM', payload: { nested: memory } }), /WebAssembly\.Memory/);
  assert.equal(gateway.auditLog().at(-1).type, 'COMMAND_ERROR');
  gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CHAT-001' });
  gateway.setChatAdapter(() => ({ status: 'OK', nested: memory }));
  await assert.rejects(() => gateway.chat({ session_id: 's1', message: 'x' }), /WebAssembly\.Memory/);
  assert.equal(gateway.auditLog().at(-1).type, 'CHAT_ERROR');
});

test('accessor properties are rejected without invoking getters and attempt is audited', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('ACCESSOR', () => ({ status: 'OK' }));
  let getterCalls = 0;
  const nested = {};
  Object.defineProperty(nested, 'secret', { enumerable: true, get() { getterCalls += 1; return 'x'; } });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'ACCESSOR', payload: { nested } }), /accessor/i);
  assert.equal(getterCalls, 0);
  assert.equal(gateway.auditLog().at(-1).type, 'COMMAND_ERROR');
});

test('thrown/rejected handlers and adapters are audited as ERROR without success records', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('FAIL', async () => { throw new Error('boom'); });
  await assert.rejects(() => gateway.execute({ session_id: 's1', command: 'FAIL' }), /boom/);
  assert.equal(gateway.auditLog().at(-1).type, 'COMMAND_ERROR');
  gateway.selectContext({ session_id: 's1', company_id: 'company-a', engine_id: 'CHAT-001' });
  gateway.setChatAdapter(async () => { throw new Error('chat-boom'); });
  await assert.rejects(() => gateway.chat({ session_id: 's1', message: 'x' }), /chat-boom/);
  assert.equal(gateway.auditLog().at(-1).type, 'CHAT_ERROR');
  assert.equal(gateway.auditLog().filter(e => ['COMMAND_EXECUTED','CHAT_MEDIATED'].includes(e.type)).length, 0);
});

test('unknown command and unavailable chat fail closed to canonical HUMAN_REQUIRED', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a' });
  assert.equal((await gateway.execute({ session_id: 's1', command: 'MISSING' })).reason, 'LOW_CONFIDENCE');
  assert.equal((await gateway.chat({ session_id: 's1', message: 'hola' })).reason, 'LOW_CONFIDENCE');
});

test('chat adapter is gateway-mediated and cannot claim noncanonical HUMAN_REQUIRED', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's1', company_id: 'company-a', context: { engine_id: 'CHAT-001' } });
  gateway.setChatAdapter(({ context, message }) => ({ status: 'OK', via: 'gateway', company_id: context.company_id, message }));
  assert.equal((await gateway.chat({ session_id: 's1', message: 'estado' })).via, 'gateway');
  gateway.setChatAdapter(() => ({ status: 'HUMAN_REQUIRED', reason: 'OTHER' }));
  await assert.rejects(() => gateway.chat({ session_id: 's1', message: 'x' }), /invalid HUMAN_REQUIRED/);
  assert.equal(gateway.auditLog().at(-1).type, 'CHAT_ERROR');
});

test('queryEngines provides the Console V0 engine consultation surface', () => {
  const gateway = new CerebroGatewayV0();
  const engines = gateway.queryEngines();
  assert.deepEqual(new Set(engines.map(e => e.engine_id)), new Set(IDS));
  assert.ok(engines.every(e => typeof e.mode === 'string'));
});

test('contract stays read-only reference: no PROD, Supabase writes, trading or direct model access', () => {
  const contract = new CerebroGatewayV0().contract();
  assert.equal(contract.prod_execution_enabled, false);
  assert.equal(contract.supabase_writes, false);
  assert.equal(contract.live_writes, false);
  assert.equal(contract.autonomous_prod, false);
  assert.equal(contract.trading_access, false);
  assert.equal(contract.direct_model_access, false);
  assert.equal(contract.additional_cost_target_eur, 0);
  assert.deepEqual(new Set(contract.engines), new Set(IDS));
});
