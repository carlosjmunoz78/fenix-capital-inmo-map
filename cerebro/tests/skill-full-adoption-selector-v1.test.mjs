import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectNextSkillFullAdoption,validateSkillFullAdoptionQueue} from '../skills/skill-full-adoption-selector-v1.mjs';

const registry=()=>JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));

test('canonical queue is safe and chooses the compounding factory skill first',()=>{
  const q=registry();
  assert.equal(validateSkillFullAdoptionQueue(q).green,true);
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'SAFE_WORK_AVAILABLE');
  assert.equal(out.selected.alias_es,'Fábrica inteligente de skills');
  assert.equal(out.selected.candidate_id,'lobehub-skills:950cf07380d1daa6de69');
  assert.equal(out.prod_write_authorized,false);
  assert.equal(out.trading_access,false);
  assert.equal(out.additional_cost_eur,0);
});

test('after factory skill is FULL, safe GitHub capability is next',()=>{
  const q=registry();
  q.queue[0].status='FULL_SAFE_PREPROD';
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.selected.alias_es,'Manejo seguro de GitHub');
});

test('HIGH_RISK candidates are never crossed automatically',()=>{
  const q=registry();
  q.queue[0].status='FULL_SAFE_PREPROD';
  q.queue[1].status='FULL_SAFE_PREPROD';
  const out=selectNextSkillFullAdoption(q);
  assert.equal(out.status,'HUMAN_REQUIRED_PENDING');
  assert.equal(out.selected,null);
  assert.deepEqual(out.blocked.map(x=>x.alias_es),['Optimización y seguridad de bases de datos','Control avanzado del navegador']);
  assert.ok(out.blocked.every(x=>x.human_required==='HIGH_RISK'));
});

test('unsafe authority expansion fails closed',()=>{
  const q=registry();
  q.policy.prod_write=true;
  assert.throws(()=>validateSkillFullAdoptionQueue(q),/unsafe policy:prod_write/);
});

test('every queued skill must have a Spanish alias',()=>{
  const q=registry();
  q.queue[0].alias_es='';
  assert.throws(()=>validateSkillFullAdoptionQueue(q),/alias_es required/);
});
