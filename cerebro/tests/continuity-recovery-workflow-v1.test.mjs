import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = '.github/workflows/cerebro-continuity-recovery-v1.yml';
const workflow = fs.readFileSync(file, 'utf8');

test('continuity recovery rides the proven LRN heartbeat and keeps an independent idle fallback', () => {
  assert.match(workflow, /workflow_run:\s*[\s\S]*CEREBRO RSI Learning Control Plane V0/);
  assert.match(workflow, /schedule:\s*[\s\S]*cron: '41 \* \* \* \*'/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
});

test('continuity recovery targets only the two governed continuity lanes', () => {
  assert.match(workflow, /LANGUAGE_WORKFLOW: cerebro-human-language-synthetic-lab-v1\.yml/);
  assert.match(workflow, /INTAKE_WORKFLOW: cerebro-universal-skill-continuous-intake-v1\.yml/);
  assert.match(workflow, /LANGUAGE_MAX_AGE_SECONDS: '2100'/);
  assert.match(workflow, /INTAKE_MAX_AGE_SECONDS: '5400'/);
  assert.match(workflow, /gh workflow run "\$workflow" --ref main/);
});

test('continuity recovery has Actions dispatch authority but no repository mutation authority', () => {
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /pull-requests:\s*write/);
  assert.doesNotMatch(workflow, /issues:\s*write/);
  assert.doesNotMatch(workflow, /packages:\s*write/);
  assert.doesNotMatch(workflow, /deployments:\s*write/);
});

test('continuity recovery is bounded and does not create authority or paid fallbacks', () => {
  assert.match(workflow, /active_count/);
  assert.match(workflow, /select\(\.conclusion == "success"\)/);
  assert.match(workflow, /dispatch_with_retry/);
  assert.match(workflow, /timeout-minutes: 8/);
  assert.doesNotMatch(workflow, /prod_write_authorized\s*:\s*true/i);
  assert.doesNotMatch(workflow, /prod_mutation_authorized\s*:\s*true/i);
  assert.doesNotMatch(workflow, /trading_access\s*:\s*true/i);
  assert.doesNotMatch(workflow, /paid_fallback\s*:\s*true/i);
});
