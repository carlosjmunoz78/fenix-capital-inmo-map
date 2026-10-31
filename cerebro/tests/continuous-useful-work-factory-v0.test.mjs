// activation_nonce: 2026-10-29T19:43Z
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskDescriptor, executeContinuousWork, WORK_FAMILIES } from '../runtime/continuous-useful-work-factory-v0.mjs';

function safeEnv(){
  process.env.CEREBRO_SUPERVISOR_ENV='PREPROD';
  process.env.CEREBRO_ALLOW_PAID_FANOUT='NO';
  process.env.CEREBRO_PROD_WRITE='false';
  process.env.CEREBRO_TRADING_ACCESS='false';
}

test('continuous work descriptor is deterministic for the same lane and cycle', () => {
  const a = buildTaskDescriptor(7, 1234);
  const b = buildTaskDescriptor(7, 1234);
  assert.deepEqual(a, b);
  assert.equal(a.lane, 7);
  assert.equal(a.cycle, 1234);
  assert.match(a.task_key, /^continuous:7:1234:/);
});

test('68 lanes are accepted and out-of-range lanes fail closed', () => {
  assert.equal(buildTaskDescriptor(0, 0).lane, 0);
  assert.equal(buildTaskDescriptor(67, 0).lane, 67);
  assert.throws(() => buildTaskDescriptor(68, 0), /lane must be an integer 0\.\.67/);
});

test('cycles rotate work families instead of repeating one static audit forever', () => {
  const seen = new Set();
  for (let cycle = 0; cycle < WORK_FAMILIES.length; cycle += 1) {
    seen.add(buildTaskDescriptor(0, cycle).family_id);
  }
  assert.equal(seen.size, WORK_FAMILIES.length);
});

test('task descriptors preserve PREPROD-safe bounded work metadata', () => {
  const task = buildTaskDescriptor(12, 88);
  assert.ok(task.family_id);
  assert.ok(task.family_title);
  assert.ok(Array.isArray(task.terms));
  assert.ok(task.terms.length > 0);
  assert.ok(task.mode);
  assert.ok(task.shard_rotation >= 0 && task.shard_rotation <= 67);
});

test('rolling evidence supports four execution slots without per-unit artifact growth',()=>{
  safeEnv();
  const previous=process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE;
  process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE='rolling';
  const laneDir=path.resolve('artifacts/continuous-work-v0/lane-00');
  try{
    for(let slot=0;slot<4;slot++){
      const r=executeContinuousWork({lane:0,cycle:slot,slot});
      assert.equal(r.execution_slot,slot);
      assert.equal(r.evidence_write_mode,'rolling');
      assert.equal(r.additional_subscription_eur,0);
      assert.equal(r.prod_write_authorized,false);
      assert.equal(r.trading_access,false);
      assert.equal(fs.existsSync(path.join(laneDir,`slot-${slot}.json`)),true);
    }
    assert.equal(fs.readdirSync(laneDir).filter(x=>x.startsWith('slot-')).length,4);
    assert.throws(()=>executeContinuousWork({lane:0,cycle:0,slot:4}),/slot must be an integer 0\.\.3/);
  }finally{
    if(previous===undefined) delete process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE;
    else process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE=previous;
    fs.rmSync(laneDir,{recursive:true,force:true});
  }
});
