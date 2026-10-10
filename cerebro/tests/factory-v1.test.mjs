import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const cli=path.join(root,'factory-v1.mjs');
const baseFile=path.join(root,'registry','engine-registry.seed.json');
const v1File=path.join(root,'registry','engine-registry.v1.json');

function run(out){return execFileSync(process.execPath,[cli,'generate','--registry',v1File,'--out',out],{encoding:'utf8'})}

test('V1 preserves all 177 canonical V0 ids and adds exactly HCI-001 and MOTION-001',()=>{
  const base=JSON.parse(fs.readFileSync(baseFile,'utf8'));const v1=JSON.parse(fs.readFileSync(v1File,'utf8'));
  assert.equal(base.count,177);assert.equal(v1.count,179);assert.equal(v1.engine_ids.length,179);assert.equal(new Set(v1.engine_ids).size,179);
  assert.deepEqual(v1.engine_ids.slice(0,177),base.engine_ids);
  assert.deepEqual(v1.engine_ids.slice(177),['HCI-001','MOTION-001']);
  assert.equal(v1.extension.preserve_base_ids,true);assert.equal(v1.extension.replace_existing_engines,false);
});

test('V1 registry remains zero-cost SCAFFOLD and cannot carry PROD or Trading authority',()=>{
  const v1=JSON.parse(fs.readFileSync(v1File,'utf8'));
  assert.equal(v1.defaults.environment,'SCAFFOLD');assert.equal(v1.extension.additional_cost_eur,0);assert.equal(v1.extension.prod_authorized,false);assert.equal(v1.extension.prod_write_authorized,false);assert.equal(v1.extension.trading_access,false);
});

test('Factory V1 validates 179 canonical engines without modifying V0 factory',()=>{
  const out=JSON.parse(execFileSync(process.execPath,[cli,'validate','--registry',v1File],{encoding:'utf8'}));
  assert.equal(out.engines,179);assert.equal(out.base_count,177);assert.equal(out.base_preserved,true);assert.deepEqual(out.added_engine_ids,['HCI-001','MOTION-001']);assert.equal(out.safe_scaffold,true);
});

test('Factory V1 generates all 179 scaffolds and extension engines have the complete 18-file contract',()=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-factory-v1-test-'));run(out);
  const index=JSON.parse(fs.readFileSync(path.join(out,'skeleton-index.json'),'utf8'));
  assert.equal(index.engine_count,179);assert.equal(index.base_engine_count,177);assert.equal(index.template_file_count,18);assert.deepEqual(index.added_engine_ids,['HCI-001','MOTION-001']);
  for(const id of ['HCI-001','MOTION-001']){
    const base=path.join(out,'engines',id);assert.ok(fs.existsSync(path.join(base,'manifest.json')));assert.ok(fs.existsSync(path.join(base,'contracts','data-contract.json')));assert.ok(fs.existsSync(path.join(base,'permissions.json')));assert.ok(fs.existsSync(path.join(base,'policy.json')));assert.ok(fs.existsSync(path.join(base,'evaluation.json')));assert.ok(fs.existsSync(path.join(base,'tribunal.json')));assert.ok(fs.existsSync(path.join(base,'observability.json')));assert.ok(fs.existsSync(path.join(base,'backup.json')));assert.ok(fs.existsSync(path.join(base,'rollback.json')));assert.ok(fs.existsSync(path.join(base,'rebuild.json')));assert.ok(fs.existsSync(path.join(base,'training-hooks.json')));
    const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));assert.equal(manifest.engine_id,id);assert.equal(manifest.lifecycle,'SCAFFOLD');assert.equal(manifest.autonomous_prod,false);assert.equal(manifest.layer,'L9');
  }
});

test('Factory V1 generation is deterministic',()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-factory-v1-a-')),b=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-factory-v1-b-'));run(a);run(b);
  assert.equal(fs.readFileSync(path.join(a,'skeleton-index.json'),'utf8'),fs.readFileSync(path.join(b,'skeleton-index.json'),'utf8'));
});
