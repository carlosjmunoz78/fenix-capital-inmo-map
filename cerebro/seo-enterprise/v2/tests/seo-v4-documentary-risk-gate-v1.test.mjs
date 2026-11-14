import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadDocumentaryRiskLedger,auditSeoV4DocumentaryRisk,writeDocumentaryRiskReport} from '../runtime/seo-v4-documentary-risk-gate-v1.mjs';
const ledger=loadDocumentaryRiskLedger();
const input=process.env.SEO_V4_QA_INPUT_DIR;
if(!input)throw Error('SEO_V4_QA_REQUIRES_PHYSICAL_ARTIFACT_INPUT');
const entries=[
 ['SEO001-FENIX-B2C-EDITORIAL-001','b2c-v4-review-only.html'],
 ['SEO001-FENIX-B2B-EDITORIAL-002','b2b-v4-review-only.html']
];
const content=entries.map(([id,file])=>({id,html:fs.readFileSync(path.join(input,file),'utf8')}));
test('physical immutable V4 samples agree with registered content-specific SHA',()=>{
 assert.equal(ledger.articles.length,2);
 for(const o of content){
  const entry=ledger.articles.find(x=>x.work_id===o.id);
  const got=crypto.createHash('sha256').update(o.html).digest('hex');
  assert.equal(got,entry.sha256);
 }
});
test('documentary issue ledger detects exact observed risks, not merely generic rules',()=>{
 const decisions=content.map(x=>auditSeoV4DocumentaryRisk({work_id:x.id,html:x.html}));
 assert.deepEqual(decisions.map(x=>x.status),['DOCUMENTARY_HIGH_RISK_RELEASE_HOLD','DOCUMENTARY_HIGH_RISK_RELEASE_HOLD']);
 assert.deepEqual(decisions.map(x=>x.risk_count),[5,4]);
 assert.ok(decisions.every(x=>x.high_risk_count>=1));
 assert.ok(decisions.every(x=>x.findings.every(y=>y.observed===true)));
 assert.ok(decisions.every(x=>x.publish_authorized===false&&x.wordpress_writes===0));
 assert.ok(decisions.every(x=>x.facts_independently_professionally_verified===false));
});
test('any semantic edit or adversarial source swap invalidates prior QA signoff',()=>{
 const a=content[0];
 const changed=a.html.replace('nota simple','certificación registral');
 const d=auditSeoV4DocumentaryRisk({work_id:a.id,html:changed});
 assert.equal(d.status,'HOLD_NEW_SHA_REQUIRES_NEW_DOCUMENTARY_QA');
 assert.equal(d.risk_count,null);
 const wrong=auditSeoV4DocumentaryRisk({work_id:content[1].id,html:a.html});
 assert.equal(wrong.status,'HOLD_NEW_SHA_REQUIRES_NEW_DOCUMENTARY_QA');
 assert.throws(()=>auditSeoV4DocumentaryRisk({work_id:'OTHER_COMPANY',html:a.html}));
});
test('missing source link and altered release permissions are rejected',()=>{
 const led=structuredClone(ledger);
 led.articles[0].issues[0].source_url='https://random-unverified.example/';
 assert.throws(()=>auditSeoV4DocumentaryRisk({work_id:content[0].id,html:content[0].html,ledger:led}),undefined);
 // Direct loaded custom ledgers are reserved for testing; reading canonical validates sources.
 assert.equal(ledger.publication_authorized,false);
 assert.equal(ledger.independent_professional_legal_signoff,false);
});
test('physical report remains temporary and cannot promote content or write to WordPress',()=>{
 const decisions=content.map(x=>auditSeoV4DocumentaryRisk({work_id:x.id,html:x.html}));
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'seo-doc-risk-'));
 try{
  const out=path.join(d,'report');
  const r=writeDocumentaryRiskReport({results:decisions,output_dir:out});
  assert.deepEqual(r.items.map(x=>x.risk_count),[5,4]);
  const saved=JSON.parse(fs.readFileSync(path.join(out,'ymyl-source-audit.json'),'utf8'));
  assert.equal(saved.provider_calls,0);
  assert.equal(saved.wordpress_writes,0);
  assert.equal(saved.publish_authorized,false);
  assert.throws(()=>writeDocumentaryRiskReport({results:decisions,output_dir:out}),/OUTPUT_NOT_ISOLATED/);
  assert.throws(()=>writeDocumentaryRiskReport({results:decisions,output_dir:'/etc/seo-risk-not-allowed'}),/OUTPUT_NOT_ISOLATED/);
 }finally{fs.rmSync(d,{recursive:true,force:true})}
});
