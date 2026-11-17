// FACT-001 LAB: physical, ephemeral generation of all canonical engine scaffolds.
// Retains zero generated files after CI run; NO deployment, NO production write.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'../..');
const factory=path.join(root,'factory-v1.mjs');
const registryFile=path.join(root,'registry/engine-registry.v1.json');
const canonical=JSON.parse(fs.readFileSync(registryFile,'utf8'));
const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-factory-179-lab-'));
const generated=path.join(sandbox,'generated');
const filesIn=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((n,d)=>n+(d.isDirectory()?filesIn(path.join(dir,d.name)):d.isFile()?1:0),0);
try{
 assert.equal(canonical.count,179);
 assert.equal(canonical.defaults.environment,'SCAFFOLD');
 assert.equal(canonical.extension.prod_authorized,false);
 const output=execFileSync(process.execPath,[factory,'generate','--registry',registryFile,'--out',generated],{
  cwd:root,encoding:'utf8',timeout:150000,maxBuffer:1024*1024
 });
 const result=JSON.parse(output.trim());
 const index=JSON.parse(fs.readFileSync(path.join(generated,'skeleton-index.json'),'utf8'));
 assert.equal(result.generated,179);
 assert.equal(index.engine_count,179);
 assert.equal(index.base_engine_count,177);
 assert.equal(index.template_file_count,18);
 assert.deepEqual(index.added_engine_ids,['HCI-001','MOTION-001']);
 assert.equal(index.engines.length,179);
 assert.deepEqual(index.engines.map(e=>e.engine_id),canonical.engine_ids);
 const unique=new Set();
 for(const e of index.engines){
  assert.equal(e.files,18,e.engine_id);
  assert.match(e.sha256,/^[0-9a-f]{64}$/,e.engine_id);
  assert(!unique.has(e.engine_id));unique.add(e.engine_id);
  const folder=path.join(generated,'engines',e.engine_id);
  assert.equal(filesIn(folder),18,e.engine_id);
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  assert.equal(typeof manifest,'object');
 }
 console.log(JSON.stringify({
  status:'PHYSICAL_LAB_FACTORY_GENERATION_VALIDATED',engine_definitions:canonical.count,
  scaffolds_generated:index.engines.length,files_per_scaffold:18,
  total_engine_files:index.engines.reduce((n,e)=>n+e.files,0),
  base_engines_preserved:177,extensions:['HCI-001','MOTION-001'],
  deployment:false,prod_modified:false,staging_access:false,model_api_calls:false,
  durable_runtime_engines_verified:false
 }));
}finally{fs.rmSync(sandbox,{recursive:true,force:true});}
