import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('JARVIS core factory materializes ten governed PREPROD capabilities',()=>{
 const repo=process.cwd();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-core-'));
 fs.mkdirSync(path.join(tmp,'cerebro/runtime'),{recursive:true});
 fs.copyFileSync(path.join(repo,'cerebro/runtime/jarvis-core-scaffold-factory-v1.mjs'),path.join(tmp,'cerebro/runtime/jarvis-core-scaffold-factory-v1.mjs'));
 const r=spawnSync(process.execPath,['cerebro/runtime/jarvis-core-scaffold-factory-v1.mjs'],{cwd:tmp,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const out=JSON.parse(r.stdout.trim());
 assert.equal(out.total_capabilities,10);
 assert.equal(out.created_files,30);
 assert.equal(out.prod_write,false);
 assert.equal(out.trading,false);
 const dirs=fs.readdirSync(path.join(tmp,'cerebro/jarvis/core'));
 assert.equal(dirs.length,10);
 for(const d of dirs){
  const m=JSON.parse(fs.readFileSync(path.join(tmp,'cerebro/jarvis/core',d,'manifest.v1.json'),'utf8'));
  assert.equal(m.environment,'PREPROD');
  assert.equal(m.status,'DEFINED_SCAFFOLD');
  assert.equal(m.prod_write_authorized,false);
  assert.equal(m.trading_access,false);
  assert.equal(m.model_dependency,'NONE_REQUIRED');
  assert.ok(fs.existsSync(path.join(tmp,'cerebro/jarvis/core',d,'contract.v1.md')));
  assert.ok(fs.existsSync(path.join(tmp,'cerebro/jarvis/core',d,'acceptance.v1.json')));
 }
});
