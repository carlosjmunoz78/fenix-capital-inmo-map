import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-browser-job-runner-v2-live.yml',import.meta.url),'utf8');
const runner=fs.readFileSync(new URL('./browser-job-runner-v2.mjs',import.meta.url),'utf8');
const interactive=fs.readFileSync(new URL('./browser-interactive-session-v3.mjs',import.meta.url),'utf8');

test('LIVE worker does not depend on a job container',()=>{
  assert.doesNotMatch(workflow,/^\s*container:\s*$/m);
  assert.doesNotMatch(workflow,/mcr\.microsoft\.com\/playwright/);
  assert.match(workflow,/name: Resolve browser runtime/);
});

test('LIVE worker prefers system Chrome with deterministic fallback',()=>{
  assert.match(workflow,/CEREBRO_BROWSER_CHANNEL=chrome/);
  assert.match(workflow,/npx playwright install --with-deps chromium/);
});

test('Browser 1 and interactive V3 both propagate the selected browser channel',()=>{
  assert.match(runner,/launch_options:\{channel\}/);
  assert.match(runner,/worker_options:browserWorkerOptions\(\)/);
  assert.match(interactive,/launch_options:\{channel\}/);
  assert.match(interactive,/createGovernedCloudBrowserWorker\(\{max_tabs:8,\.\.\.browserWorkerOptions\(\)\}\)/);
});

test('host runtime patch preserves the eight-slot governed worker pool',()=>{
  assert.match(workflow,/CEREBRO_BROWSER_STAGE_CONCURRENCY: '8'/);
  assert.match(workflow,/max-parallel: 8/);
  assert.match(workflow,/slot: \[1,2,3,4,5,6,7,8\]/);
});

test('CP122 idle rearm gate: no empty-queue self-dispatch, retain scheduled wake-up and worker pool',()=>{
  const rearm=workflow.split('\n  rearm:\n')[1];
  assert.ok(rearm,'existing rearm job must remain');
  assert.match(rearm,/needs\.queue\.result == 'success' && needs\.queue\.outputs\.pending != '0'/);
  assert.match(rearm,/github\.event_name != 'schedule'/);
  assert.match(rearm,/github\.run_attempt == 1/);
  assert.match(workflow,/schedule:\s*\n\s*- cron: '\*\/5 \* \* \* \*'/);
  assert.match(workflow,/workflow_run:\s*\n\s*workflows: \['PROD Runtime Smoke'\]/);
  assert.match(workflow,/name: Browser 1 V2 worker \$\{\{ matrix\.slot \}\} \/ 8/);
  assert.match(rearm,/Dispatch next bounded consumer cycle or use schedule fallback/);
  // This gate does not alter the underlying queue lease, owner checks or existing eight-slot capacity.
});
