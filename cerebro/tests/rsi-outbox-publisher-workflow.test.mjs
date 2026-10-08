import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-rsi-learning-outbox-publisher-v0.yml',import.meta.url),'utf8');

test('publisher listens only to successful main Skill Discovery or explicit dispatch and serializes writes',()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/CEREBRO Skill Discovery Scout/);
  assert.match(workflow,/workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/workflow_run\.head_branch == 'main'/);
  assert.match(workflow,/group: cerebro-rsi-learning-outbox-publisher-v0/);
  assert.match(workflow,/cancel-in-progress: false/);
});

test('publisher uses dedicated append-only state branch and exact immutable discovery artifact',()=>{
  assert.match(workflow,/OUTBOX_STATE_BRANCH: cerebro-rsi-learning-outbox-v0/);
  assert.match(workflow,/cerebro-skill-discovery-\$SOURCE_RUN_ID/);
  assert.match(workflow,/cerebro-skill-improvement-events\.json/);
  assert.match(workflow,/rsi-event-outbox\.mjs/);
  assert.match(workflow,/git push origin "HEAD:refs\/heads\/\$OUTBOX_STATE_BRANCH"/);
});

test('publisher has no secrets, paid providers, PROD or Trading authority',()=>{
  assert.match(workflow,/contents: write/);
  assert.match(workflow,/actions: read/);
  assert.match(workflow,/prod_authorized \/\/ false/);
  assert.match(workflow,/trading_access \/\/ false/);
  assert.match(workflow,/additional_cost_eur \/\/ 0/);
  assert.doesNotMatch(workflow,/secrets\.|API_KEY|STRIPE|SUPABASE_SERVICE|TRADING/i);
});
