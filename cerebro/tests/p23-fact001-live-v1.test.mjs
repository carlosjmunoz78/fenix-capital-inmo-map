import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runP23Audit, validateGovernance, buildAuditPoint } from '../runtime/p23/fact001-audit-live-v1.mjs';

const ROOT=path.resolve(process.cwd());
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));

test('P23 governance covers exact 179 engines and stays fail-closed',()=>{
  const proof=validateGovernance(read('cerebro/registry/engine-registry.v1.json'),read('cerebro/registry/prod-engine-governance.v1.json'),read('cerebro/audit/p23-live-contract.v1.json'));
  assert.equal(proof.registry_total,179);
  assert.equal(proof.prod_registered,179);
  assert.equal(proof.execution_authorized,0);
  assert.equal(proof.write_authorized,0);
  assert.equal(proof.trading_access,false);
  assert.equal(proof.additional_cost_eur,0);
  assert.equal(proof.p23_live,true);
});

test('P23 point exposes required audit fields without granting PROD execution',()=>{
  const p=buildAuditPoint({engine_id:'FACT-001',layer:'L0',version:'0.1.0',physical_foundation:true,gates:{contracts:true,permissions:false},gate_count:1,gate_total:2,autonomous_prod_ready:false},{auditedAt:'2026-11-02T14:00:00.000Z',sourceSha:'1111111111111111111111111111111111111111',environment:'PREPROD',companyId:'fenix'});
  for(const key of ['company_id','engine_id','environment','version','status','score','criticidad','fallos','plan_de_mejora','fecha'])assert.ok(Object.hasOwn(p,key),key);
  assert.equal(p.status,'PROD_REGISTERED_FAIL_CLOSED');
  assert.equal(p.prod_execution_authorized,false);
  assert.equal(p.prod_write_authorized,false);
  assert.equal(p.trading_access,false);
  assert.deepEqual(p.fallos,['permissions']);
});

test('P23 live runtime writes 179 unique FACT-001 audit points deterministically',()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'p23-a-'));
  const b=fs.mkdtempSync(path.join(os.tmpdir(),'p23-b-'));
  const input={auditedAt:'2026-11-02T14:00:00.000Z',sourceSha:'2222222222222222222222222222222222222222',environment:'PREPROD',companyId:'fenix'};
  try{
    const ra=runP23Audit({outDir:a,...input});
    const rb=runP23Audit({outDir:b,...input});
    assert.equal(ra.summary.status,'GREEN');
    assert.equal(ra.summary.p23_live,true);
    assert.equal(ra.summary.audit_points,179);
    assert.equal(ra.summary.prod_registered,179);
    assert.equal(ra.summary.prod_execution_authorized,0);
    assert.equal(ra.summary.prod_write_authorized,0);
    assert.equal(ra.summary.trading_access,false);
    assert.equal(new Set(ra.points.map(x=>x.engine_id)).size,179);
    assert.equal(fs.readFileSync(path.join(a,'LATEST.json'),'utf8'),fs.readFileSync(path.join(b,'LATEST.json'),'utf8'));
    assert.equal(fs.readFileSync(path.join(a,'AUDIT_POINTS.jsonl'),'utf8'),fs.readFileSync(path.join(b,'AUDIT_POINTS.jsonl'),'utf8'));
  } finally { fs.rmSync(a,{recursive:true,force:true});fs.rmSync(b,{recursive:true,force:true}); }
});
