import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionGatewayV1 } from '../gateway/action-gateway-v1.mjs';
import { CerebroGatewayV0 } from '../console/gateway.mjs';
import { bindConsoleToActionGatewayV1 } from '../console/action-gateway-binding-v1.mjs';

const context = {
  company_id: 'fenix',
  engine_id: 'ACTGW-001',
  environment: 'PREPROD',
  version: '0.1.0'
};

test('ACTGW-001 executes only registered low-risk PREPROD capabilities', async () => {
  const gateway = new ActionGatewayV1();
  gateway.registerCapability('echo.safe', async ({ context: ctx, payload }) => ({ ok: true, company_id: ctx.company_id, value: payload.value }));
  const result = await gateway.execute({
    context,
    authorized: true,
    capability: 'echo.safe',
    payload: { value: 7 },
    idempotency_key: 'idem-1',
    risk: 'LOW'
  });
  assert.equal(result.status, 'ACTION_EXECUTED');
  assert.equal(result.executed, true);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.company_id, 'fenix');
  assert.equal(gateway.auditLog().at(-1).type, 'ACTION_EXECUTED');
});

test('ACTGW-001 is idempotent and does not execute a duplicate twice', async () => {
  const gateway = new ActionGatewayV1();
  let calls = 0;
  gateway.registerCapability('counter.safe', async () => ({ calls: ++calls }));
  const input = { context, authorized: true, capability: 'counter.safe', payload: {}, idempotency_key: 'idem-repeat', risk: 'LOW' };
  const first = await gateway.execute(input);
  const second = await gateway.execute(input);
  assert.equal(first.result.calls, 1);
  assert.equal(second.result.calls, 1);
  assert.equal(calls, 1);
  assert.equal(gateway.auditLog().at(-1).type, 'ACTION_REPLAYED');
});

test('ACTGW-001 fails closed for unknown capabilities', async () => {
  const gateway = new ActionGatewayV1();
  const result = await gateway.execute({
    context,
    authorized: true,
    capability: 'unknown.capability',
    payload: {},
    idempotency_key: 'idem-unknown',
    risk: 'LOW'
  });
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'LOW_CONFIDENCE');
  assert.equal(result.executed, false);
});

test('ACTGW-001 blocks PROD writes, trading, signatures, high risk and paid actions', async () => {
  const gateway = new ActionGatewayV1();
  gateway.registerCapability('safe', async () => ({ ok: true }));

  const prod = await gateway.execute({ context, authorized: true, capability: 'safe', payload: {}, idempotency_key: 'idem-prod', requires_prod_write: true });
  assert.equal(prod.reason, 'HIGH_RISK');

  const trading = await gateway.execute({ context, authorized: true, capability: 'safe', payload: {}, idempotency_key: 'idem-trading', trading_access: true });
  assert.equal(trading.reason, 'POLICY_CONFLICT');

  const signature = await gateway.execute({ context, authorized: true, capability: 'safe', payload: {}, idempotency_key: 'idem-sign', signature_required: true });
  assert.equal(signature.reason, 'SIGNATURE_REQUIRED');

  const high = await gateway.execute({ context, authorized: true, capability: 'safe', payload: {}, idempotency_key: 'idem-high', risk: 'HIGH' });
  assert.equal(high.reason, 'HIGH_RISK');

  const paid = await gateway.execute({ context, authorized: true, capability: 'safe', payload: {}, idempotency_key: 'idem-paid', estimated_additional_cost_eur: 1 });
  assert.equal(paid.reason, 'MONEY_LIMIT');
});

test('Console V0 routes an action through ACTGW-001 instead of executing directly', async () => {
  const consoleGateway = new CerebroGatewayV0({ environment: 'PREPROD', version: '0.1.0' });
  const actionGateway = new ActionGatewayV1();
  actionGateway.registerCapability('echo.safe', async ({ payload }) => ({ echoed: payload.message }));
  bindConsoleToActionGatewayV1({ consoleGateway, actionGateway });
  consoleGateway.createSession({ session_id: 's1', company_id: 'fenix' });

  const result = await consoleGateway.execute({
    session_id: 's1',
    command: 'action.execute',
    payload: {
      authorized: true,
      capability: 'echo.safe',
      payload: { message: 'ok' },
      idempotency_key: 'console-idem-1',
      risk: 'LOW'
    }
  });

  assert.equal(result.status, 'ACTION_EXECUTED');
  assert.equal(result.result.echoed, 'ok');
  assert.equal(result.context.engine_id, 'ACTGW-001');
  assert.equal(consoleGateway.auditLog().at(-1).type, 'COMMAND_EXECUTED');
});
