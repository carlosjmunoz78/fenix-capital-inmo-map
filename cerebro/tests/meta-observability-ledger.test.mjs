import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {MetaObservabilityLedger,makeMetaTimingSample} from '../runtime/meta-observability-ledger.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-meta-metrics-'));}
function sample(i,{collect=10,learn=20,evaluate=5}={}){return makeMetaTimingSample({company_id:'fenix',version:'0.8.0',observed_at:`2026-10-0${i}T12:00:00Z`,collect_ms:collect+i,learn_ms:learn+i,evaluate_ms:evaluate+i,statuses:{learning:'GREEN'}});}
function timed(at){return makeMetaTimingSample({company_id:'fenix',version:'0.8.0',observed_at:at,collect_ms:1,learn_ms:2,evaluate_ms:3,statuses:{learning:'GREEN'}});}

test('meta timing ledger persists and reopens without customer data or authority',()=>{
  const root=temp();const file=path.join(root,'meta.v8');
  try{
    const ledger=new MetaObservabilityLedger({file_path:file});const s=sample(1);const first=ledger.append(s);const duplicate=ledger.append(s);
    assert.equal(first.accepted,true);assert.equal(duplicate.duplicate,true);assert.equal(ledger.operation_count,1);
    const reopened=new MetaObservabilityLedger({file_path:file});const rows=reopened.list({company_id:'fenix',version:'0.8.0'});assert.equal(rows.length,1);assert.equal(rows[0].raw_customer_data_included,false);assert.equal(rows[0].prod_authorized,false);assert.equal(rows[0].trading_access,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('appendIfDue bounds persistent timings to at most hourly samples per tenant/version',()=>{
  const root=temp();
  try{
    const ledger=new MetaObservabilityLedger({file_path:path.join(root,'meta.v8')});
    assert.equal(ledger.appendIfDue(timed('2026-10-08T12:00:00Z')).accepted,true);
    const early=ledger.appendIfDue(timed('2026-10-08T12:30:00Z'));assert.equal(early.not_due,true);assert.equal(ledger.operation_count,1);
    assert.equal(ledger.appendIfDue(timed('2026-10-08T13:00:00Z')).accepted,true);assert.equal(ledger.operation_count,2);
    assert.throws(()=>ledger.appendIfDue(timed('2026-10-08T12:59:00Z')),/moved backwards/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('summary exposes measured canonical stage latency only',()=>{
  const root=temp();const file=path.join(root,'meta.v8');
  try{
    const ledger=new MetaObservabilityLedger({file_path:file});ledger.append(sample(1,{collect:2,learn:20,evaluate:4}));ledger.append(sample(2,{collect:4,learn:30,evaluate:6}));ledger.append(sample(3,{collect:6,learn:40,evaluate:8}));
    const summary=ledger.summarize({company_id:'fenix',version:'0.8.0'});assert.equal(summary.samples_total,3);assert.equal(summary.stage_metrics.learn.mean_ms,32);assert.ok(summary.stage_metrics.learn.p95_ms>=summary.stage_metrics.learn.mean_ms);assert.equal(summary.raw_customer_data_included,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('invalid environment or authority is rejected',()=>{
  const root=temp();
  try{
    const ledger=new MetaObservabilityLedger({file_path:path.join(root,'meta.v8')});const s={...sample(1),environment:'PROD'};assert.throws(()=>ledger.append(s),/exact PREPROD/);assert.throws(()=>ledger.append({...sample(2),prod_authorized:true}),/authority expanded/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
