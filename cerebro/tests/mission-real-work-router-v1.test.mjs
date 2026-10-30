import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectMissionUnit } from '../runtime/mission-derived-useful-work-v1.mjs';
import { routeMissionRealWorkV1 } from '../runtime/mission-real-work-router-v1.mjs';

const safeEnv = {
  CEREBRO_SUPERVISOR_ENV: process.env.CEREBRO_SUPERVISOR_ENV,
  CEREBRO_PROD_WRITE: process.env.CEREBRO_PROD_WRITE,
  CEREBRO_TRADING_ACCESS: process.env.CEREBRO_TRADING_ACCESS,
  CEREBRO_ALLOW_PAID_FANOUT: process.env.CEREBRO_ALLOW_PAID_FANOUT,
  CEREBRO_MISSION_FACT001_OUT_DIR: process.env.CEREBRO_MISSION_FACT001_OUT_DIR,
};
function applySafe(root) {
  process.env.CEREBRO_SUPERVISOR_ENV='PREPROD';
  process.env.CEREBRO_PROD_WRITE='false';
  process.env.CEREBRO_TRADING_ACCESS='false';
  process.env.CEREBRO_ALLOW_PAID_FANOUT='NO';
  process.env.CEREBRO_MISSION_FACT001_OUT_DIR=root;
}
function restore() {
  for (const [key,value] of Object.entries(safeEnv)) value == null ? delete process.env[key] : process.env[key]=value;
}

test('known deterministic slots resolve to M16/M18 implement.scaffold', () => {
  assert.equal(selectMissionUnit(12,9).unit.work_unit_id, 'M16.implement.scaffold');
  assert.equal(selectMissionUnit(44,11).unit.work_unit_id, 'M18.implement.scaffold');
});

test('M16 implement.scaffold routes to real FACT-001 artifacts', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-router-m16-'));
  try {
    applySafe(root);
    const result=routeMissionRealWorkV1({lane:12,cycle:9,fallback:true});
    assert.equal(result.work_unit_id,'M16.implement.scaffold');
    assert.equal(result.state,'FACT001_SCAFFOLD_GENERATED');
    assert.equal(result.physical_execution_used,true);
    assert.deepEqual(result.physical_target_engines,['CONSOLE-001','ACTGW-001']);
    assert.equal(result.generated_file_count,36);
    assert.equal(result.prod_write_authorized,false);
    assert.equal(result.trading_access,false);
  } finally { restore(); fs.rmSync(root,{recursive:true,force:true}); }
});

test('M18 implement.scaffold routes to WEB/App Factory artifacts', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-router-m18-'));
  try {
    applySafe(root);
    const result=routeMissionRealWorkV1({lane:44,cycle:11,fallback:true});
    assert.equal(result.work_unit_id,'M18.implement.scaffold');
    assert.equal(result.state,'FACT001_SCAFFOLD_GENERATED');
    assert.deepEqual(result.physical_target_engines,['WEB-001','APPBOOT-001']);
    assert.equal(result.generated_file_count,36);
  } finally { restore(); fs.rmSync(root,{recursive:true,force:true}); }
});
