import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-rsi-learning-control-plane-v0.yml',import.meta.url),'utf8');

test('control plane is hostless, periodic and event-driven without requiring the PC',()=>{
  assert.match(workflow,/cron: '\*\/15 \* \* \* \*'/);
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/CEREBRO RSI Learning Outbox Publisher V0/);
  assert.match(workflow,/workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/workflow_run\.head_branch == 'main'/);
  assert.match(workflow,/schedule_semantics:"BEST_EFFORT_15_MINUTE_PLUS_EVENT"/);
  assert.doesNotMatch(workflow,/self-hosted|windows-latest|Browser Bridge|Task Scheduler/i);
});

test('source authority stays on main while durable LRN state uses a distinct branch',()=>{
  assert.match(workflow,/ref: main/);
  assert.match(workflow,/OUTBOX_STATE_BRANCH: cerebro-rsi-learning-outbox-v0/);
  assert.match(workflow,/LRN_STATE_BRANCH: cerebro-rsi-learning-state-v0/);
  assert.match(workflow,/LRN_STATE_ROOT: cerebro\/runtime\/rsi-learning-state/);
  assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$LRN_STATE_BRANCH"/);
  assert.doesNotMatch(workflow,/git add -A|git add \./);
  assert.match(workflow,/git add "\$LRN_STATE_ROOT"/);
});

test('bounded runner uses Node 24 and one runAutoHostIteration rather than a daemon',()=>{
  assert.match(workflow,/node-version: 24/);
  assert.match(workflow,/runAutoHostIteration/);
  assert.match(workflow,/HOSTLESS_BOUNDED_ITERATION/);
  assert.doesNotMatch(workflow,/runAutoHostLoop| daemon --config/);
});

test('control plane persists PREPROD-only state with zero added cost and no Trading or PROD authority',()=>{
  assert.match(workflow,/engine_id:"LRN-001"/);
  assert.match(workflow,/environment:"PREPROD"/);
  assert.match(workflow,/additional_cost_eur:0/);
  assert.match(workflow,/prod_authorized:false/);
  assert.match(workflow,/prod_write_authorized:false/);
  assert.match(workflow,/trading_access:false/);
  assert.match(workflow,/policy_pass:true/);
  assert.match(workflow,/security_pass:true/);
  assert.match(workflow,/local_persistence_enabled:true/);
});

test('runtime job needs only GitHub contents write and introduces no external credentials or paid provider dependency',()=>{
  assert.match(workflow,/run-preprod-control-plane:[\s\S]*?permissions:\s*\n\s*contents: write/);
  assert.match(workflow,/contract-test:[\s\S]*?permissions:\s*\n\s*contents: read/);
  assert.match(workflow,/raw\.githubusercontent\.com/);
  assert.doesNotMatch(workflow,/secrets\.|SUPABASE_SERVICE|SERVICE_ROLE|API_KEY|STRIPE|OPENAI_API|MAKE_|VERCEL_TOKEN|RAILWAY|RENDER|FLY_API/i);
});
