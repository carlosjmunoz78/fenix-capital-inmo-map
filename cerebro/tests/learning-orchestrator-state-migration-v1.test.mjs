import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {migrateOrchestratorStateVersion,persistDueLearningPlans} from '../runtime/learning-orchestrator.mjs';

const OLD=Object.freeze({
  schema_version:'1.0.0',
  state_type:'CEREBRO_LRN_ORCHESTRATOR_STATE',
  company_id:'fenix',
  engine_id:'LRN-001',
  environment:'PREPROD',
  version:'0.5.0',
  last_success:{DAILY:'2026-10-19T10:02:08.781Z',WEEKLY:'2026-10-15T20:21:38.540Z',MONTHLY:'2026-10-08T18:22:32.144Z'},
  plans_emitted:14,
  additional_cost_eur:0,
  prod_authorized:false,
  prod_write_authorized:false,
  trading_access:false,
  last_planned_at:'2026-10-19T23:46:02.135Z',
  last_result:{cadence:'DAILY',status:'GREEN',completed_at:'2026-10-19T10:02:08.781Z'}
});
const NOW='2026-10-20T12:00:00.000Z';

function clone(value){return JSON.parse(JSON.stringify(value));}

test('migrates only the supported 0.5.0 -> 0.6.0 durable state and preserves progress',()=>{
  const migrated=migrateOrchestratorStateVersion(clone(OLD),{company_id:'fenix',version:'0.6.0',now:NOW});
  assert.equal(migrated.version,'0.6.0');
  assert.equal(migrated.schema_version,'1.0.0');
  assert.deepEqual(migrated.last_success,OLD.last_success);
  assert.equal(migrated.plans_emitted,14);
  assert.deepEqual(migrated.last_result,OLD.last_result);
  assert.equal(migrated.last_state_migration.from_version,'0.5.0');
  assert.equal(migrated.last_state_migration.to_version,'0.6.0');
  assert.equal(migrated.last_state_migration.reason,'RUNTIME_VERSION_COMPATIBILITY');
  assert.equal(migrated.prod_authorized,false);
  assert.equal(migrated.prod_write_authorized,false);
  assert.equal(migrated.trading_access,false);
  assert.equal(migrated.additional_cost_eur,0);
});

test('current state is idempotent and does not manufacture a migration',()=>{
  const current={...clone(OLD),version:'0.6.0'};
  const result=migrateOrchestratorStateVersion(current,{company_id:'fenix',version:'0.6.0',now:NOW});
  assert.equal(result,current);
  assert.equal(result.migration_history,undefined);
});

for(const [name,patch] of [
  ['company',{company_id:'other'}],
  ['engine',{engine_id:'OTHER-001'}],
  ['environment',{environment:'PROD'}]
]){
  test(`${name} context mismatch remains fail-closed`,()=>{
    assert.throws(()=>migrateOrchestratorStateVersion({...clone(OLD),...patch},{company_id:'fenix',version:'0.6.0',now:NOW}),/ORCHESTRATOR_STATE_CONTEXT_MISMATCH/);
  });
}

test('unknown version transition remains fail-closed',()=>{
  assert.throws(()=>migrateOrchestratorStateVersion({...clone(OLD),version:'0.4.0'},{company_id:'fenix',version:'0.6.0',now:NOW}),/ORCHESTRATOR_STATE_VERSION_MIGRATION_UNSUPPORTED/);
});

test('physical persistence migrates the durable state without resetting counters or widening authority',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lrn-migrate-'));
  try{
    const stateFile=path.join(root,'orchestration-state.json');
    const plansDir=path.join(root,'plans');
    fs.writeFileSync(stateFile,`${JSON.stringify(OLD,null,2)}\n`);
    const result=persistDueLearningPlans({state_file:stateFile,plans_dir:plansDir,company_id:'fenix',version:'0.6.0',now:NOW});
    const persisted=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    assert.equal(result.status,'ORCHESTRATOR_GREEN');
    assert.equal(persisted.version,'0.6.0');
    assert.ok(persisted.plans_emitted>=OLD.plans_emitted);
    assert.deepEqual(persisted.last_success,OLD.last_success);
    assert.equal(persisted.prod_authorized,false);
    assert.equal(persisted.prod_write_authorized,false);
    assert.equal(persisted.trading_access,false);
    assert.equal(persisted.additional_cost_eur,0);
    assert.equal(persisted.last_state_migration.from_version,'0.5.0');
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
});
