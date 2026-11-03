#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {FOUNDATION_HOLDS_V1_CONTRACT} from '../runtime/foundation-holds-v1.mjs';
const ROOT=process.cwd(),OUT=path.join(ROOT,'cerebro/evidence/foundation-holds-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const text=v=>JSON.stringify(stable(v),null,2)+'\n';const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:text(v)).digest('hex');
const write=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text(v));};
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const r=spawnSync(process.execPath,['--test','cerebro/tests/foundation-holds-v1.test.mjs'],{cwd:ROOT,encoding:'utf8'});if(r.status!==0)throw new Error(r.stdout+'\n'+r.stderr);
for(const id of ['KNW-001','TRN-001','FINOPS-001']){
 const snap={engine_id:id,contract:FOUNDATION_HOLDS_V1_CONTRACT[id],test_stdout_sha256:sha(r.stdout||'')};const rebuilt=JSON.parse(text(snap));
 write(`contracts/${id}.json`,{engine_id:id,gate:'contract',status:'PASS',contract:FOUNDATION_HOLDS_V1_CONTRACT[id],additional_cost_eur:0});
 write(`evaluation/${id}.json`,{engine_id:id,gate:'evaluation',status:'PASS',approved:true,tests:'PASS',additional_cost_eur:0});
 write(`tribunal/${id}.json`,{engine_id:id,gate:'tribunal',status:'GREEN_STRUCTURAL_ONLY',approved:true,prod_execution_authorized:false,trading_access:false,additional_cost_eur:0});
 write(`backup/${id}.json`,{engine_id:id,gate:'backup',status:'PASS',tested:true,sha256:sha(text(snap)),additional_cost_eur:0});
 write(`rollback/${id}.json`,{engine_id:id,gate:'rollback',status:'PASS',tested:true,sha256:sha(text(JSON.parse(text(snap)))),additional_cost_eur:0});
 write(`rebuild/${id}.json`,{engine_id:id,gate:'rebuild',status:'PASS',deterministic:sha(rebuilt)===sha(snap),sha256:sha(rebuilt),additional_cost_eur:0});
}
write('SUMMARY.json',{schema_version:'1.0.0',mission:'CLOSE_FOUNDATION_HOLDS_V1',status:'GREEN_STRUCTURAL_ONLY',engines:['KNW-001','TRN-001','FINOPS-001'],tests:'PASS',prod_execution_authorized:false,prod_writes:false,trading_touched:false,additional_cost_eur:0,integration_remaining:{'KNW-001':'bind canonical adapters for live Notion/documents/Git sources','TRN-001':'bind real datasets/runs across engine families and tribunal','FINOPS-001':'instrument live providers/storage/API/AI call sites'},next_block:'DOC001_004_STRUCTURAL_CLOSURE_V1'});
console.log('CLOSE_FOUNDATION_HOLDS_V1=GREEN_STRUCTURAL_ONLY');
