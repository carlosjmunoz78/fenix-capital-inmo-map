import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { laneDescriptor, executePortfolioPriorityUnit } from '../runtime/portfolio-priority-sustained-v1.mjs';

test('priority portfolio exposes 182 base lanes plus 100 temporary loan lanes',()=>{
  const base=Array.from({length:182},(_,lane)=>laneDescriptor(lane,0));
  const loan=Array.from({length:100},(_,i)=>laneDescriptor(182+i,0));
  assert.equal(base.length,182);
  assert.equal(loan.length,100);
  assert.ok(base.every(x=>x.loan_lane===false));
  assert.ok(loan.every(x=>x.loan_lane===true));
});

test('base lanes preserve JARVIS-first fair-share priorities',()=>{
  const base=Array.from({length:182},(_,lane)=>laneDescriptor(lane,7));
  const counts=Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,base.filter(x=>x.priority===p).length]));
  assert.deepEqual(counts,{P0:104,P1:60,P2:8,P3:10});
  assert.equal(base.filter(x=>['W13','W21'].includes(x.block_id)).length,48);
  assert.ok(base.filter(x=>x.priority==='P0').every(x=>['W10','W11','W13','W15','W16','W21'].includes(x.block_id)));
});

test('loan capacity only expands P0/P1/P2 and never dilutes priority into P3',()=>{
  const loan=Array.from({length:100},(_,i)=>laneDescriptor(182+i,11));
  const counts=Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,loan.filter(x=>x.priority===p).length]));
  assert.deepEqual(counts,{P0:60,P1:30,P2:10,P3:0});
});

test('all 282 lanes have deterministic unique lane identity and bounded cycles',()=>{
  const all=Array.from({length:282},(_,lane)=>laneDescriptor(lane,999999));
  assert.equal(new Set(all.map(x=>x.lane)).size,282);
  assert.ok(all.every(x=>x.cycle===999999));
  assert.throws(()=>laneDescriptor(282,0),/lane must be 0\.\.281/);
  assert.throws(()=>laneDescriptor(0,1000000),/cycle must be 0\.\.999999/);
});

test('rolling evidence supports four bounded execution slots without artifact growth per unit',()=>{
  const previous=process.env.CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE;
  process.env.CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE='rolling';
  const evidencePath=path.resolve('artifacts/portfolio-priority-sustained-v1/lane-000/slot-3.json');
  try {
    const report=executePortfolioPriorityUnit({lane:0,cycle:0,slot:3});
    assert.equal(report.execution_slot,3);
    assert.equal(report.evidence_write_mode,'rolling');
    assert.equal(report.additional_subscription_eur,0);
    assert.equal(report.prod_write_authorized,false);
    assert.equal(report.trading_access,false);
    assert.equal(fs.existsSync(evidencePath),true);
    const persisted=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
    assert.equal(persisted.execution_slot,3);
    assert.equal(persisted.task.lane,0);
    assert.throws(()=>executePortfolioPriorityUnit({lane:0,cycle:0,slot:4}),/slot must be 0\.\.3/);
  } finally {
    if(previous===undefined) delete process.env.CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE;
    else process.env.CEREBRO_PORTFOLIO_SUSTAINED_WRITE_MODE=previous;
    fs.rmSync(path.resolve('artifacts/portfolio-priority-sustained-v1/lane-000'),{recursive:true,force:true});
  }
});
