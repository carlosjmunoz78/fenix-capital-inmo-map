import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/cerebro-neuronal-superparallel-v1.yml'),'utf8');

test('NEURONAL preserves 100 logical units while bounding physical fanout to 25 runners',()=>{
  assert.match(workflow,/CEREBRO_NEURONAL_INNER_PARALLELISM: '4'/);
  assert.match(workflow,/const batchSize = 4/);
  assert.match(workflow,/max-parallel: 25/);
  assert.match(workflow,/fair_share_logical_cap:100/);
  assert.match(workflow,/physical_runner_cap:25/);
  assert.match(workflow,/enterprise_neuronal_logical_fair_share=100/);
  assert.match(workflow,/enterprise_neuronal_physical_runner_cap=25/);
  assert.match(workflow,/physical_runner_savings_at_100_logical=75/);
});

test('each NEURONAL runner executes no more than four deterministic evidence processes and waits for all',()=>{
  assert.match(workflow,/test "\$LOGICAL_UNITS" -le "\$CEREBRO_NEURONAL_INNER_PARALLELISM"/);
  assert.match(workflow,/IFS=',' read -r -a submissions/);
  assert.match(workflow,/for submission_id in "\$\{submissions\[@\]\}"/);
  assert.match(workflow,/neuronal-superparallel-source-v1\.mjs --mode=evidence --submission="\$submission_id" &/);
  assert.match(workflow,/for pid in \$pids; do wait "\$pid"; done/);
  assert.match(workflow,/test "\$count" -eq "\$LOGICAL_UNITS"/);
});

test('NEURONAL remains PREPROD zero-paid by default and pauses refill for every critical gate including FACT-001',()=>{
  assert.match(workflow,/CEREBRO_SUPERVISOR_ENV: PREPROD/);
  assert.match(workflow,/CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow,/CEREBRO_TRADING_ACCESS: 'false'/);
  assert.match(workflow,/default: false\n        type: boolean/);
  for(const critical of [
    'cerebro-enterprise-acceleration-v0.yml',
    'cerebro-global-capacity-controller-v1-ci.yml',
    'cerebro-auto001-preprod-patch-executor-v0.yml',
    'cerebro-auto001-prod-closure-v1.yml',
    'cerebro-governed-promotion-v1.yml',
    'cerebro-fact001-repair-worker-factory-v1.yml',
  ]) assert.ok(workflow.includes(critical),`missing critical gate ${critical}`);
  assert.match(workflow,/drain_reason=CRITICAL_CONTROL_PRESSURE/);
  assert.match(workflow,/neuronal_self_refill=false/);
  assert.match(workflow,/critical_gate_priority=true/);
});
