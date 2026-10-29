import test from 'node:test';
import assert from 'node:assert/strict';
import { selectMissionUnit, executeMissionDerivedWork } from '../runtime/mission-derived-useful-work-v1.mjs';

const safeEnv=()=>{
  process.env.CEREBRO_SUPERVISOR_ENV='PREPROD';
  process.env.CEREBRO_ALLOW_PAID_FANOUT='NO';
  process.env.CEREBRO_PROD_WRITE='false';
  process.env.CEREBRO_TRADING_ACCESS='false';
};

test('same lane/cycle selects the same mission atomic unit',()=>{
  const a=selectMissionUnit(7,3);const b=selectMissionUnit(7,3);
  assert.equal(a.unit.work_unit_id,b.unit.work_unit_id);
  assert.equal(a.graph_fingerprint,b.graph_fingerprint);
  assert.equal(a.atomic_count,2352);
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

test('safe deterministic mission work produces evidence',()=>{
  safeEnv();
  const r=executeMissionDerivedWork({lane:0,cycle:0,fallback:false});
  assert.equal(r.execution_state,'EVIDENCE_COLLECTED');
  assert.equal(r.environment,'PREPROD');
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
});

test('scope-dependent implementation fails closed and old deterministic worker is fallback',()=>{
  safeEnv();
  const r=executeMissionDerivedWork({lane:36,cycle:0,fallback:true});
  assert.equal(r.phase,'implement');
  assert.equal(r.execution_state,'SCOPE_HYDRATION_REQUIRED');
  assert.equal(r.scope_hydration_required,true);
  assert.equal(r.fallback.used,true);
});

test('unsafe environments fail closed',()=>{
  safeEnv();process.env.CEREBRO_PROD_WRITE='true';
  assert.throws(()=>executeMissionDerivedWork({lane:0,cycle:0,fallback:false}),/PROD writes/);
  safeEnv();process.env.CEREBRO_ALLOW_PAID_FANOUT='YES';
  assert.throws(()=>executeMissionDerivedWork({lane:0,cycle:0,fallback:false}),/paid AI/);
  safeEnv();
});
