#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT=process.cwd();
const out=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-179-human-required-'));
const mission=path.join(ROOT,'cerebro/missions/audit-179-autonomy-readiness-v1.mjs');
const run=spawnSync(process.execPath,[mission,'--out',out],{cwd:ROOT,encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout);

const report=JSON.parse(fs.readFileSync(path.join(out,'AUTONOMY_READINESS_BASELINE.json'),'utf8'));
assert.equal(report.registry_total,179);
assert.equal(report.engines.length,179);
assert.deepEqual(report.engines[0].human_required_allowed,[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const unreadiness=report.engines.filter(engine=>!engine.autonomous_prod_ready);
assert.ok(unreadiness.length>0,'fixture must contain at least one engine not autonomous-prod-ready');
for(const engine of unreadiness){
  assert.equal(engine.human_required,null,`${engine.engine_id}: unreadiness must not fabricate HUMAN_REQUIRED`);
  assert.ok(Array.isArray(engine.readiness_blockers),`${engine.engine_id}: readiness blockers must be explicit`);
}

assert.equal(
  report.human_required_semantics,
  'UNREADINESS_IS_NOT_HUMAN_REQUIRED; HUMAN_REQUIRED IS_RESERVED_FOR_EXPLICIT_CANONICAL_EXCEPTION_CAUSES'
);
console.log(`PASS audit-179 HUMAN_REQUIRED semantics (${unreadiness.length} unreadiness rows checked)`);
