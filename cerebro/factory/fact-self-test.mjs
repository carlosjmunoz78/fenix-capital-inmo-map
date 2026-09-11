#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const factory=path.join(root,'factory.mjs');
const registry=path.join(root,'registry','engine-registry.seed.json');

function run(out){
  const r=spawnSync(process.execPath,[factory,'generate','--registry',registry,'--out',out],{encoding:'utf8'});
  if(r.status!==0)throw new Error(`factory generate failed: ${r.stderr||r.stdout}`);
  return JSON.parse(fs.readFileSync(path.join(out,'skeleton-index.json'),'utf8'));
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name));}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-fact-selftest-'));
try{
  const a=path.join(tmp,'a');
  const b=path.join(tmp,'b');
  const first=run(a);
  fs.rmSync(a,{recursive:true,force:true});
  const rebuilt=run(a);
  const independent=run(b);
  const sameRebuild=JSON.stringify(first)===JSON.stringify(rebuilt);
  const sameIndependent=JSON.stringify(first)===JSON.stringify(independent);
  if(first.engine_count!==177||first.template_file_count!==18)throw new Error('canonical factory cardinality mismatch');
  if(!sameRebuild||!sameIndependent)throw new Error('factory output is not reproducible');
  const engineDirs=fs.readdirSync(path.join(a,'engines'));
  if(engineDirs.length!==177)throw new Error('generated engine directory count mismatch');
  for(const engineId of engineDirs){
    const files=walk(path.join(a,'engines',engineId));
    if(files.length!==18)throw new Error(`${engineId} generated file count mismatch: ${files.length}`);
  }
  console.log(JSON.stringify({status:'GREEN',engine_id:'FACT-001',canonical_engines:177,files_per_engine:18,self_test:true,rebuild_equivalent:true,independent_generation_equivalent:true,old_vs_new_scope:'STRUCTURAL_FACTORY_OUTPUT',prod_writes:false,trading_access:false,additional_cost_eur:0}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
