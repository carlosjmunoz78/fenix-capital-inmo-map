import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {verifyAutoRepairPilot,runAutoRepairLive,writeAutoRepairEvidence,PATH,BATCH_ID}
 from '../runtime/seo-autorepair-one-batch-live-runner-v4.mjs';
const files=[
 PATH,
 'cerebro/seo-enterprise/v2/registry/seo001-autorepair-one-batch-v3-2026-11-08.json',
 'cerebro/seo-enterprise/v2/registry/seo001-autorepair-one-batch-v3-result-2026-11-08.json'
];
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'seo001-autorepair-v4-'));
 for(const file of files){
  fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.copyFileSync(file,path.join(root,file));
 }
 const m=JSON.parse(fs.readFileSync(path.join(root,PATH),'utf8'));
 m.workflow_trigger_nonce='TRIGGER_ONCE_20261108_AUTOREPAIR_V4';
 m.status='PREPARED_NOT_EXECUTED';
 fs.writeFileSync(path.join(root,PATH),JSON.stringify(m));
 return {root,m};
}
test('new batch is distinct from consumed old batch; exact nonce controls admission',()=>{
 assert.equal(BATCH_ID,'SEO001-AUTOREPAIR-PILOT-20261108-V4');
 const m=JSON.parse(fs.readFileSync(PATH,'utf8'));
 if(m.status==='PREPARED_NOT_EXECUTED'&&m.workflow_trigger_nonce==='TRIGGER_ONCE_20261108_AUTOREPAIR_V4'){
   const v=verifyAutoRepairPilot();
   assert.equal(v.max_calls,4);
 }else{
   assert.ok((m.status==='PREPARED_NOT_EXECUTED'&&m.workflow_trigger_nonce==='PREPARED_NOT_TRIGGERED')||
     (m.status==='COMPLETED_HOLD'&&m.workflow_trigger_nonce==='CONSUMED_20261108_AUTOREPAIR_V4'));
   assert.throws(()=>verifyAutoRepairPilot(),/SEO001_AUTOREPAIR_V4_MANIFEST_RELEASE_OR_COST_GUARD/);
 }
});
test('10 old lessons and 2 original source-only topics survive in new brief with unique IDs',()=>{
 const {root}=fixture();
 try{
  const x=verifyAutoRepairPilot({root});
  assert.equal(x.lessons,10);
  assert.equal(x.max_calls,4);
  assert.equal(x.manifest.briefs.length,2);
  assert.equal(x.manifest.status,'PREPARED_NOT_EXECUTED');
  assert.equal(x.manifest.allow_wordpress_writes,false);
  assert.equal(x.manifest.allow_wordpress_publication,false);
  assert.equal(x.manifest.owner_cost_ceiling_eur,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('any cost, publication or old-batch tampering prevents inference',()=>{
 const {root,m}=fixture();
 try{
  for(const mutation of [x=>x.owner_cost_ceiling_eur=1,x=>x.allow_wordpress_writes=true,
    x=>x.allow_image_api_calls=true,x=>x.allow_paid_fallback=true,
    x=>x.max_real_model_calls=5,x=>x.workflow_trigger_nonce='CONSUMED']){
   const bad=JSON.parse(JSON.stringify(m));mutation(bad);
   fs.writeFileSync(path.join(root,PATH),JSON.stringify(bad));
   assert.throws(()=>verifyAutoRepairPilot({root}),/SEO001_AUTOREPAIR_V4_MANIFEST_RELEASE_OR_COST_GUARD/);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('no free-tier secret emits HOLD artifact without network calls',async()=>{
 const {root}=fixture();
 const out=path.join(os.tmpdir(),'seo001-no-secret-'+process.pid);
 try{
  const v=await runAutoRepairLive({root,api_key:null});
  assert.equal(v.status,'HOLD_FREE_SECRET_NOT_AVAILABLE');
  assert.equal(v.model_calls,0);
  assert.equal(v.wordpress_writes,0);
  assert.equal(v.publish_allowed,false);
  if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});
  const receipt=writeAutoRepairEvidence({result:v,output_dir:out});
  assert.equal(receipt.wordpress_writes,0);
  assert.ok(fs.existsSync(path.join(out,'manifest.json')));
 }finally{fs.rmSync(out,{recursive:true,force:true});fs.rmSync(root,{recursive:true,force:true});}
});
test('release evidence must reject models with publisher permission or too many calls',()=>{
 const data={batch_id:BATCH_ID,model_calls:5,published:0,wordpress_writes:0,publish_allowed:false,works:[]};
 assert.throws(()=>writeAutoRepairEvidence({result:data,output_dir:path.join(os.tmpdir(),'seo001_bad')}),/EVIDENCE_SCOPE/);
 data.model_calls=0;data.published=1;
 assert.throws(()=>writeAutoRepairEvidence({result:data,output_dir:path.join(os.tmpdir(),'seo001_bad')}),/EVIDENCE_SCOPE/);
});

test('Free tier project must be documented and zero billing configured',()=>{
 const {root,m}=fixture();
 try{
   const p=path.join(root,PATH);
   const altered=JSON.parse(JSON.stringify(m));
   altered.external_free_tier_check.plan='Tier 1';
   fs.writeFileSync(p,JSON.stringify(altered));
   assert.throws(()=>verifyAutoRepairPilot({root}),/FREE_TIER_EVIDENCE_MISSING/);
   altered.external_free_tier_check.plan='Nivel gratuito';
   altered.external_free_tier_check.billing_configured=true;
   fs.writeFileSync(p,JSON.stringify(altered));
   assert.throws(()=>verifyAutoRepairPilot({root}),/FREE_TIER_EVIDENCE_MISSING/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
