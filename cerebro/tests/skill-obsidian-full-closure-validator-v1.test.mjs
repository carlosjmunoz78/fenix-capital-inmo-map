import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runObsidianFullPreprodIntegration} from '../skills/skill-obsidian-full-preprod-integration-v1.mjs';
import {validateObsidianFullClosure} from '../skills/skill-obsidian-full-closure-validator-v1.mjs';

const read=(relative)=>JSON.parse(fs.readFileSync(new URL(relative,import.meta.url),'utf8'));
const surface=()=>read('../human-intelligence/knowledge/knowledge-surface-map.v1.json');
const registry=()=>read('../registry/skill-full-adoption-v1.json');
const closure=()=>read('../registry/skill-obsidian-full-safe-preprod.v1.json');

function integration(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-obsidian-closure-test-'));
  const report=runObsidianFullPreprodIntegration({rootDir:root,knowledgeSurface:surface(),adoptionRegistry:registry()});
  return {root,report};
}

test('Obsidian closure becomes promotion-ready only after the complete FULL PREPROD evidence stack is green',()=>{
  const {root,report}=integration();
  try{
    const out=validateObsidianFullClosure({closure:closure(),adoptionRegistry:registry(),integrationReport:report});
    assert.equal(out.status,'READY_TO_PROMOTE_QUEUE');
    assert.deepEqual(out.errors,[]);
    assert.equal(out.prod_write_authorized,false);
    assert.equal(out.trading_access,false);
    assert.equal(out.external_skill_code_execution_authorized,false);
    assert.equal(out.additional_cost_eur,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Obsidian closure fails closed if observability, LRN idempotency or knowledge boundary regresses',()=>{
  const {root,report}=integration();
  try{
    const broken=structuredClone(report);
    broken.observability_records=0;
    broken.lrn001_feedback.replay_duplicates=0;
    broken.canonical_knowledge_replaced=true;
    const out=validateObsidianFullClosure({closure:closure(),adoptionRegistry:registry(),integrationReport:broken});
    assert.equal(out.status,'HOLD');
    assert.ok(out.errors.includes('OBSERVABILITY_NOT_CONNECTED'));
    assert.ok(out.errors.includes('LRN_REPLAY_DUPLICATE_MISMATCH'));
    assert.ok(out.errors.includes('KNOWLEDGE_BOUNDARY_REGRESSION'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('once the queue is marked FULL the closure must carry exact successful CI evidence',()=>{
  const {root,report}=integration();
  try{
    const r=registry();
    const item=r.queue.find((entry)=>entry.candidate_id==='lobehub-skills:9a6e3fac20369220df43');
    item.status='FULL_SAFE_PREPROD';
    const c=closure();
    c.status='FULL_SAFE_PREPROD';
    c.validation_status='CI_GREEN';
    c.validated_by={workflow:'CEREBRO Skill Full Adoption V1',run_id:123456,head_sha:'a'.repeat(40),conclusion:'success'};
    const green=validateObsidianFullClosure({closure:c,adoptionRegistry:r,integrationReport:report});
    assert.equal(green.status,'READY_TO_PROMOTE_QUEUE');
    c.validated_by.conclusion='failure';
    const held=validateObsidianFullClosure({closure:c,adoptionRegistry:r,integrationReport:report});
    assert.equal(held.status,'HOLD');
    assert.ok(held.errors.includes('QUEUE_FULL_REQUIRES_SUCCESS'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
