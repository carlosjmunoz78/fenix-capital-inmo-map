import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(testDir, '../../.github/workflows/cerebro-continuity-recovery-v1.yml');
const workflow = fs.readFileSync(file, 'utf8');

test('continuity recovery has independent and event-driven heartbeat sources', () => {
  assert.match(workflow, /workflow_run:\s*[\s\S]*CEREBRO RSI Learning Control Plane V0/);
  assert.match(workflow, /workflow_run:\s*[\s\S]*CEREBRO Continuous Human QA V0/);
  assert.match(workflow, /workflow_run:\s*[\s\S]*CEREBRO AUTO-001 PREPROD Patch Executor V0/);
  assert.match(workflow, /schedule:\s*[\s\S]*cron: '41 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'main'/);
});

test('continuity recovery targets the four governed continuity lanes', () => {
  assert.match(workflow, /LANGUAGE_WORKFLOW: cerebro-human-language-synthetic-lab-v1\.yml/);
  assert.match(workflow, /INTAKE_WORKFLOW: cerebro-universal-skill-continuous-intake-v1\.yml/);
  assert.match(workflow, /SCOUT_WORKFLOW: cerebro-skill-github-wide-scout\.yml/);
  assert.match(workflow, /ACTION_WORKER_WORKFLOW: cerebro-skill-autonomy-safe-action-worker-v1\.yml/);
  assert.match(workflow, /LANGUAGE_MAX_AGE_SECONDS: '2100'/);
  assert.match(workflow, /INTAKE_MAX_AGE_SECONDS: '5400'/);
  assert.match(workflow, /SCOUT_MAX_AGE_SECONDS: '4500'/);
  assert.match(workflow, /ACTION_WORKER_MAX_AGE_SECONDS: '4500'/);
  assert.match(workflow, /recover_if_stale "\$SCOUT_WORKFLOW" "\$SCOUT_MAX_AGE_SECONDS"/);
  assert.match(workflow, /recover_if_stale "\$ACTION_WORKER_WORKFLOW" "\$ACTION_WORKER_MAX_AGE_SECONDS"/);
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
