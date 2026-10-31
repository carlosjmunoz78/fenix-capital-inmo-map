import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMissionUnit, executeMissionDerivedWork } from '../runtime/mission-derived-useful-work-v1.mjs';

const safeEnv=()=>{
  process.env.CEREBRO_SUPERVISOR_ENV='PREPROD';
  process.env.CEREBRO_ALLOW_PAID_FANOUT='NO';
  process.env.CEREBRO_PROD_WRITE='false';
  process.env.CEREBRO_TRADING_ACCESS='false';
};

test('same lane/cycle selects the same hydrated mission atomic unit',()=>{
  const a=selectMissionUnit(7,3);const b=selectMissionUnit(7,3);
  assert.equal(a.unit.work_unit_id,b.unit.work_unit_id);
  assert.equal(a.graph_fingerprint,b.graph_fingerprint);
  assert.equal(a.atomic_count,2352);
  assert.equal(a.scope_hydrated,true);
  assert.equal(a.hydrated_mission_count,28);
  assert.match(a.canonical_source_sha256,/^[a-f0-9]{64}$/);
  assert.equal(a.unit.source_status,'CANONICAL_SCOPE_HYDRATED');
  assert.ok(a.unit.mission_scope);
});

test('linear lane/cycle mapping reaches all 2352 atomic units exactly once before wrap',()=>{
  const ids=new Set();
  for(let k=0;k<2352;k++){
    const lane=k%68;const cycle=Math.floor(k/68);
    ids.add(selectMissionUnit(lane,cycle).unit.work_unit_id);
  }
  assert.equal(ids.size,2352);
});

test('first 68 simultaneous lanes do not collide',()=>{
  const ids=new Set(Array.from({length:68},(_,lane)=>selectMissionUnit(lane,0).unit.work_unit_id));
  assert.equal(ids.size,68);
});

test('first 28 lanes span all 28 mission roots immediately',()=>{
  const missions=new Set(Array.from({length:28},(_,lane)=>selectMissionUnit(lane,0).unit.mission_id));
  assert.equal(missions.size,28);
});

test('safe deterministic mission work produces hydrated evidence',()=>{
  safeEnv();
  const r=executeMissionDerivedWork({lane:0,cycle:0,fallback:false});
  assert.equal(r.execution_state,'EVIDENCE_COLLECTED');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.scope_hydrated,true);
  assert.equal(r.hydrated_mission_count,28);
  assert.equal(r.scope_hydration_required,false);
  assert.ok(r.mission_scope.scope_text);
  assert.equal(r.paid_ai_used,false);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.trading_access,false);
});

test('capability packet is audited and routed without paid acquisition',()=>{
  safeEnv();
  const r=executeMissionDerivedWork({lane:24,cycle:0,fallback:false});
  assert.equal(r.work_unit.kind,'capability_work_unit');
  assert.ok(r.capability);
  assert.equal(r.capability.additional_cost_eur,0);
  assert.equal(r.capability.paid_ai,false);
  assert.equal(r.scope_hydration_required,false);
});

test('scope-dependent implementation consumes canonical hydrated scope without legacy fallback',()=>{
  safeEnv();
  const r=executeMissionDerivedWork({lane:36,cycle:0,fallback:true});
  assert.equal(r.phase,'implement');
  assert.equal(r.execution_state,'SCOPE_HYDRATED_EVIDENCE_COLLECTED');
  assert.equal(r.scope_hydration_required,false);
  assert.equal(r.work_unit.source_status,'CANONICAL_SCOPE_HYDRATED');
  assert.ok(r.mission_scope.title);
  assert.ok(r.mission_scope.scope_text);
  assert.equal(r.fallback.used,false);
});

test('rolling Mission DAG evidence supports four bounded execution slots',()=>{
  safeEnv();
  const previousMission=process.env.CEREBRO_MISSION_WORK_WRITE_MODE;
  const previousContinuous=process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE;
  process.env.CEREBRO_MISSION_WORK_WRITE_MODE='rolling';
  process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE='rolling';
  const laneDir=path.resolve('artifacts/mission-derived-work-v1/lane-01');
  try{
    for(let slot=0;slot<4;slot++){
      const r=executeMissionDerivedWork({lane:1,cycle:slot,slot,fallback:true});
      assert.equal(r.execution_slot,slot);
      assert.equal(r.evidence_write_mode,'rolling');
      assert.equal(r.additional_subscription_eur,0);
      assert.equal(r.prod_write_authorized,false);
      assert.equal(r.trading_access,false);
      assert.equal(fs.existsSync(path.join(laneDir,`slot-${slot}.json`)),true);
    }
    assert.equal(fs.readdirSync(laneDir).filter(x=>x.startsWith('slot-')).length,4);
    assert.throws(()=>executeMissionDerivedWork({lane:1,cycle:0,slot:4,fallback:false}),/slot must be an integer 0\.\.3/);
  }finally{
    if(previousMission===undefined) delete process.env.CEREBRO_MISSION_WORK_WRITE_MODE;
    else process.env.CEREBRO_MISSION_WORK_WRITE_MODE=previousMission;
    if(previousContinuous===undefined) delete process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE;
    else process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE=previousContinuous;
    fs.rmSync(laneDir,{recursive:true,force:true});
  }
});

test('unsafe environments fail closed',()=>{
  safeEnv();process.env.CEREBRO_PROD_WRITE='true';
  assert.throws(()=>executeMissionDerivedWork({lane:0,cycle:0,fallback:false}),/PROD writes/);
  safeEnv();process.env.CEREBRO_ALLOW_PAID_FANOUT='YES';
  assert.throws(()=>executeMissionDerivedWork({lane:0,cycle:0,fallback:false}),/paid AI/);
  safeEnv();
});
