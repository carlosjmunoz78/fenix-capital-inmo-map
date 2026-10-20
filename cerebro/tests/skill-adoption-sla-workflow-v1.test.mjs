import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'cerebro-skill-adoption-sla-v1.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('skill adoption SLA guard uses the approved 5m recovery and 10m hard red thresholds', () => {
  assert.match(workflow, /SOFT_SLA_SECONDS:\s*'300'/);
  assert.match(workflow, /HARD_SLA_SECONDS:\s*'600'/);
  assert.match(workflow, /POLL_SECONDS:\s*'15'/);
  assert.match(workflow, /SKILL_ADOPTION_SLA_RED/);
});

test('guard is driven by the two governed intake workflows and exact proposal artifacts', () => {
  assert.match(workflow, /CEREBRO Universal Skill Continuous Intake V1/);
  assert.match(workflow, /CEREBRO Known Skill Pool Intake V1/);
  assert.match(workflow, /cerebro-dynamic-adoption-proposal-\$\{SOURCE_RUN_ID\}/);
  assert.match(workflow, /FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY/);
  assert.match(workflow, /PROD_CAPABILITY_AVAILABLE_READONLY/);
});

test('recovery reuses the existing governed dynamic adoption lane and cannot mutate repository content', () => {
  assert.match(workflow, /DYNAMIC_WORKFLOW: cerebro-dynamic-skill-adoption-v1\.yml/);
  assert.match(workflow, /gh workflow run "\$DYNAMIC_WORKFLOW" --ref main/);
  assert.match(workflow, /permissions:\n\s+contents: read\n\s+actions: write/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /git push|git commit|npm install|child_process/);
});

test('promotion verification stays read-only, zero-cost and outside trading', () => {
  assert.match(workflow, /row\.prod_write_authorized!==false\|\|row\.prod_mutation_authorized!==false/);
  assert.match(workflow, /row\.external_skill_code_execution!==false\|\|row\.trading_access!==false/);
  assert.match(workflow, /Number\(row\.additional_cost_eur\)!==0/);
  assert.match(workflow, /row\.canary\?\.side_effects!==false/);
  assert.match(workflow, /row\.canary\?\.ref!=='refs\/heads\/main'/);
});
