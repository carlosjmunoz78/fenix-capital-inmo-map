import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildDocSync,writeDocSync} from '../factory/factory-doc-sync.mjs';
const seed={engine_ids:['FACT-001','KNW-001']};
const updated_docs={ENGINE_REGISTRY:true,DEPENDENCY_MAP:true,RUNBOOK:true,CHANGELOG:true,BACKUP_REBUILD:true,AUTONOMY_STATE:true};
test('builds deterministic canonical status registry and docs report',()=>{
  const evidence={records:[{engine_id:'FACT-001',state:'PREPROD_GREEN',evidence_refs:['run://375']}],updated_docs};
  const a=buildDocSync({seed,evidence});
  const b=buildDocSync({seed,evidence});
  assert.deepEqual(a,b);
  assert.equal(a.engine_status_registry.engine_count,2);
  assert.equal(a.engine_status_registry.counts.PREPROD_GREEN,1);
  assert.equal(a.documentation.status,'DOCS_SYNC_READY');
  assert.equal(a.safety.prod_write,false);
  assert.equal(a.safety.auto_merge,false);
});
test('writes only requested output directory and remains rebuildable',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fact-doc-sync-'));
  const evidence={records:[],updated_docs};
  writeDocSync({seed,evidence,out:path.join(root,'one')});
  writeDocSync({seed,evidence,out:path.join(root,'two')});
  for(const file of ['engine-status-registry.json','docs-sync-report.json']){
    assert.equal(fs.readFileSync(path.join(root,'one',file),'utf8'),fs.readFileSync(path.join(root,'two',file),'utf8'));
  }
});
test('fails closed when canonical docs are incomplete',()=>{
  const r=buildDocSync({seed,evidence:{records:[],updated_docs:{...updated_docs,CHANGELOG:false}}});
  assert.equal(r.documentation.status,'BLOCKED');
  assert.equal(r.documentation.missing.includes('CHANGELOG'),true);
});
