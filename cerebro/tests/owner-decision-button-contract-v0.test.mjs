import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const guard=fs.readFileSync(new URL('../../src/CerebroOwnerDecisionGuard.tsx',import.meta.url),'utf8');
const gateway=fs.readFileSync(new URL('../../supabase/functions/cerebro-owner-decision-gateway-v0/index.ts',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../../supabase/functions/cerebro-owner-decision-worker-v0/index.ts',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-human-communication-v1.yml',import.meta.url),'utf8');

test('GET route never submits an owner decision automatically',()=>{
  assert.match(guard,/onClick=\{confirm\}/);
  const beforeConfirm=guard.split('async function confirm')[0]||'';
  assert.doesNotMatch(beforeConfirm,/functions\.invoke/);
  assert.match(guard,/async function confirm\(\)[^]*functions\.invoke\(['"]cerebro-owner-decision-gateway-v0['"]/);
  assert.match(gateway,/req\.method\s*!==\s*['"]POST['"]/);
  assert.match(gateway,/METHOD_NOT_ALLOWED/);
});

test('only exact canonical decisions and APR ids reach ingress',()=>{
  for(const command of ['AUTORIZO','NO AUTORIZO','EXPLICAME','APARCO']) assert.match(gateway,new RegExp(command.replace(' ','\\s')));
  assert.match(gateway,/APR-\\d\{8\}-\[A-F0-9\]\{8\}/);
  assert.match(gateway,/actorContext\.actor_code\s*!==\s*['"]CARLOS-ADMIN['"]/);
  assert.match(gateway,/CONTROL_PLANE_INGRESS_ONLY/);
  assert.match(gateway,/executed\s*:\s*false/);
});

test('GitHub worker requires OIDC repo main ref and exact communication workflow',()=>{
  assert.match(worker,/token\.actions\.githubusercontent\.com/);
  assert.match(worker,/carlosjmunoz78\/fenix-capital-inmo-map/);
  assert.match(worker,/refs\/heads\/main/);
  assert.match(worker,/cerebro-human-communication-v1\.yml/);
  assert.match(workflow,/id-token: write/);
  assert.match(workflow,/messages\.merged\.json/);
  assert.match(workflow,/Acknowledge owner button decisions only after controller and state persistence succeed/);
});
