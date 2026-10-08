import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ingress=fs.readFileSync(new URL('../../.github/workflows/cerebro-rsi-universal-learning-ingress-v0.yml',import.meta.url),'utf8');
const control=fs.readFileSync(new URL('../../.github/workflows/cerebro-rsi-learning-control-plane-v0.yml',import.meta.url),'utf8');
const skillOutbox=fs.readFileSync(new URL('../../.github/workflows/cerebro-rsi-learning-outbox-publisher-v0.yml',import.meta.url),'utf8');

test('universal ingress exposes one bounded repository_dispatch contract for operational learning signals',()=>{
  assert.match(ingress,/repository_dispatch:/);
  assert.match(ingress,/cerebro_learning_signal/);
  assert.match(ingress,/client_payload\.signal/);
  assert.match(ingress,/universal-learning-ingress\.mjs/);
  assert.match(ingress,/rsi-event-outbox\.mjs/);
  assert.match(ingress,/rsi-learning-subscribers\.v0\.json/);
});

test('universal ingress and skill publisher serialize writes to the same append-only outbox branch',()=>{
  assert.match(ingress,/OUTBOX_STATE_BRANCH: cerebro-rsi-learning-outbox-v0/);
  assert.match(ingress,/group: cerebro-rsi-learning-outbox-writer-v0/);
  assert.match(skillOutbox,/OUTBOX_STATE_BRANCH: cerebro-rsi-learning-outbox-v0/);
  assert.match(skillOutbox,/group: cerebro-rsi-learning-outbox-writer-v0/);
  assert.doesNotMatch(ingress,/git add -A|git add \./);
  assert.match(ingress,/git add "\$OUTBOX_STATE_ROOT"/);
});

test('universal ingress is fail-closed for authority, customer data, secrets and incremental cost',()=>{
  assert.match(ingress,/prod_authorized == false/);
  assert.match(ingress,/prod_write_authorized == false/);
  assert.match(ingress,/trading_access == false/);
  assert.match(ingress,/additional_cost_eur == 0/);
  assert.doesNotMatch(ingress,/secrets\.|SUPABASE_SERVICE|SERVICE_ROLE|OPENAI_API|STRIPE|MAKE_|VERCEL_TOKEN/i);
});

test('successful universal ingress wakes the hostless LRN control plane automatically',()=>{
  assert.match(control,/CEREBRO RSI Universal Learning Ingress V0/);
  assert.match(control,/workflow_run\.conclusion == 'success'/);
  assert.match(control,/workflow_run\.head_branch == 'main'/);
  assert.match(control,/BEST_EFFORT_15_MINUTE_PLUS_EVENT/);
});
