import test from 'node:test';
import assert from 'node:assert/strict';
import { CerebroGatewayV0 } from '../console/gateway.mjs';

test('command-returned canonical HUMAN_REQUIRED is recorded as escalation, not success', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's-command', company_id: 'company-a', context: { engine_id: 'CMD-001' } });
  gateway.registerCommand('RISKY', () => ({ status: 'HUMAN_REQUIRED', reason: 'HIGH_RISK', detail: 'manual review' }));

  const result = await gateway.execute({ session_id: 's-command', command: 'RISKY' });
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'HIGH_RISK');

  const history = gateway.inspectSession('s-command').history;
  assert.equal(history.at(-1).kind, 'HUMAN_REQUIRED');
  assert.equal(history.at(-1).source, 'COMMAND');
  assert.equal(history.at(-1).command, 'RISKY');
  assert.equal(history.filter(e => e.kind === 'COMMAND').length, 0);

  const audit = gateway.auditLog();
  assert.equal(audit.at(-1).type, 'HUMAN_REQUIRED');
  assert.equal(audit.at(-1).source, 'COMMAND');
  assert.equal(audit.filter(e => e.type === 'COMMAND_EXECUTED').length, 0);
});

test('chat-returned canonical HUMAN_REQUIRED is recorded as escalation, not mediated success', async () => {
  const gateway = new CerebroGatewayV0();
  gateway.createSession({ session_id: 's-chat', company_id: 'company-a', context: { engine_id: 'CHAT-001' } });
  gateway.setChatAdapter(() => ({ status: 'HUMAN_REQUIRED', reason: 'LOW_CONFIDENCE', detail: 'needs human' }));

  const result = await gateway.chat({ session_id: 's-chat', message: 'revisa esto' });
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'LOW_CONFIDENCE');

  const history = gateway.inspectSession('s-chat').history;
  assert.equal(history.at(-1).kind, 'HUMAN_REQUIRED');
  assert.equal(history.at(-1).source, 'CHAT');
  assert.equal(history.filter(e => e.kind === 'CHAT').length, 0);

  const audit = gateway.auditLog();
  assert.equal(audit.at(-1).type, 'HUMAN_REQUIRED');
  assert.equal(audit.at(-1).source, 'CHAT');
  assert.equal(audit.filter(e => e.type === 'CHAT_MEDIATED').length, 0);
});
