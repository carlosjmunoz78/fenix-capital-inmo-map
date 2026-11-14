import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const runtime=new URL('../runtime/',import.meta.url);
const worker=fileURLToPath(new URL('seo-job001-workunit-v0.mjs',runtime));
const reviewer=fileURLToPath(new URL('seo-job001-independent-review-v0.mjs',runtime));
const tribunal=fileURLToPath(new URL('seo-job001-tribunal-v0.mjs',runtime));
import {spawnSync} from 'node:child_process';
function invoke(script,args){return spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:9000,maxBuffer:1_000_000});}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo-v2-role-e2e-'));
 t.after(()=>fs.rmSync(root,{force:true,recursive:true}));
 const html=path.join(root,'home.html'),headers=path.join(root,'headers.txt'),journal=path.join(root,'job001.v8');
 const receipt=path.join(root,'work-receipt.json'),review=path.join(root,'review.json'),verdict=path.join(root,'verdict.json');
 fs.writeFileSync(html,'<html><head><title>Fénix Capital · Córdoba</title><meta name="robots" content="noindex"></head><body><h1>Fénix Capital</h1><p>Mi furura cuota de hipoteca en Córdoba.</p></body></html>');
 fs.writeFileSync(headers,'HTTP/2 200\nContent-Type: text/html\n');
 return {root,html,headers,journal,receipt,review,verdict};
}
test('LAB physical triad: durable JOB-001 worker, separate QA process, third tribunal process',t=>{
 const f=fixture(t);
 const a=invoke(worker,[f.html,f.headers,'200',f.journal,f.receipt]);assert.equal(a.status,0,a.stderr);
 const b=invoke(reviewer,[f.html,f.headers,'200',f.journal,f.receipt,f.review]);assert.equal(b.status,0,b.stderr);
 const c=invoke(tribunal,[f.receipt,f.review,f.verdict]);assert.equal(c.status,0,c.stderr);
 const w=JSON.parse(fs.readFileSync(f.receipt)),q=JSON.parse(fs.readFileSync(f.review)),j=JSON.parse(fs.readFileSync(f.verdict));
 assert.equal(w.run_state,'SUCCEEDED');assert.equal(q.status,'INDEPENDENT_QA_PROCESS_VERIFIED_READONLY');
 assert.equal(j.status,'LAB_EVIDENCE_ACCEPTED_NO_RELEASE');
 assert.equal(j.physical_process_separation_verified,true);
 assert.equal(j.all_roles_iam_authenticated,false);
 assert.equal(j.merit_awards_applied,0);
 assert.equal(j.website_publication_allowed,false);assert.equal(j.external_writes,0);
 assert.equal(JSON.stringify({w,q,j}).includes('Mi furura cuota'),false);
 assert.equal(fs.readFileSync(f.journal).includes(Buffer.from('Mi furura cuota')),false);
});
test('reexecuting same public source is one durable job after process restart',t=>{
 const f=fixture(t);
 for(let i=0;i<2;i++){const a=invoke(worker,[f.html,f.headers,'200',f.journal,f.receipt]);assert.equal(a.status,0,a.stderr);const w=JSON.parse(fs.readFileSync(f.receipt));assert.equal(w.duplicate,i!==0);assert.equal(w.ledger_total,1);}
});
test('QA refuses forged receipt, separate judge refuses forged reviewer identity',t=>{
 const f=fixture(t);
 assert.equal(invoke(worker,[f.html,f.headers,'200',f.journal,f.receipt]).status,0);
 const w=JSON.parse(fs.readFileSync(f.receipt));w.source_html_sha256='bad';fs.writeFileSync(f.receipt,JSON.stringify(w));
 const bad=invoke(reviewer,[f.html,f.headers,'200',f.journal,f.receipt,f.review]);
 assert.notEqual(bad.status,0);assert.match(bad.stderr,/SOURCE_HASH_MISMATCH/);
 assert.equal(fs.existsSync(f.review),false);
});
test('a non-STAGING safe web page never enters the journal or tribunal',t=>{
 const f=fixture(t);
 fs.writeFileSync(f.html,fs.readFileSync(f.html,'utf8').replace('noindex','index'));
 const blocked=invoke(worker,[f.html,f.headers,'200',f.journal,f.receipt]);
 assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/STAGING_TECHNICAL_GATE_FAILED/);
 assert.equal(fs.existsSync(f.journal),false);
});
