import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeCandidateSourceEvidence,resolveCandidatePriority} from '../skills/skill-source-evidence-normalizer.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-source-'));}
function write(dir,name,value){fs.writeFileSync(path.join(dir,name),`${JSON.stringify(value,null,2)}\n`,'utf8');}
function base(dir,priority,candidate){
  write(dir,`cerebro-skill-value-${priority}.json`,{results:[{candidate_id:candidate}]});
  write(dir,`cerebro-skill-wrapper-plans-${priority}.json`,{plans:[{candidate_id:candidate}]});
  write(dir,`cerebro-skill-prelab-reviewed-${priority}.json`,{results:[{candidate_id:candidate}]});
  write(dir,'cerebro-skill-manifests.json',{results:[{candidate_id:candidate}]});
  write(dir,'cerebro-skill-license-evidence.json',{results:[{candidate_id:candidate}]});
  write(dir,'cerebro-skill-shortlist.json',{results:[{candidate_id:candidate}]});
}

test('normalizes existing P0 evidence without changing safety boundaries',()=>{
  const src=temp();const out=temp();base(src,'p0','cand:p0');
  const meta=normalizeCandidateSourceEvidence(src,'cand:p0',out);
  assert.equal(meta.source_priority,'P0');
  assert.equal(meta.prod_write,false);
  assert.equal(meta.external_code_executed,false);
  for(const file of ['value.json','wrappers.json','prelab.json','manifests.json','licenses.json','shortlist.json','source-meta.json']) assert.equal(fs.existsSync(path.join(out,file)),true);
});

test('normalizes P1 evidence so the existing safe handler can consume it',()=>{
  const src=temp();const out=temp();base(src,'p1','cand:p1');
  const meta=normalizeCandidateSourceEvidence(src,'cand:p1',out);
  assert.equal(meta.source_priority,'P1');
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'value.json'),'utf8')).results[0].candidate_id,'cand:p1');
});

test('supports P2 but rejects ambiguous candidate presence across priorities',()=>{
  const src=temp();const out=temp();base(src,'p2','cand:p2');
  assert.equal(resolveCandidatePriority(src,'cand:p2'),'p2');
  write(src,'cerebro-skill-value-p1.json',{results:[{candidate_id:'cand:p2'}]});
  assert.throws(()=>resolveCandidatePriority(src,'cand:p2'),/exactly one priority value report/);
});

test('fails closed when a required immutable report is missing',()=>{
  const src=temp();const out=temp();base(src,'p1','cand:missing');
  fs.unlinkSync(path.join(src,'cerebro-skill-license-evidence.json'));
  assert.throws(()=>normalizeCandidateSourceEvidence(src,'cand:missing',out),/missing required immutable source evidence/);
});
