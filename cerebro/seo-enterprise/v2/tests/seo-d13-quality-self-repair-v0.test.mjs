import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFaqMarkup,runSelfRepairItem,runSelfRepairBatch,SELF_REPAIR_POLICY,targetedRepairFeedback}
 from '../runtime/seo-d13-quality-self-repair-v0.mjs';
const brief=(id,persona='PARTICULARES')=>({
 work_id:id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',persona});
const goodQa=()=>({technical_copy_precheck:'PASS',copy_issues:[],full_quality_certified:false,publish_allowed:false});
const badQa=()=>({technical_copy_precheck:'HOLD',copy_issues:['SIX_MAIN_H2_REQUIRED'],full_quality_certified:false,publish_allowed:false});
function looseFaq(){
 return '<h1>Gastos de un piso en Córdoba</h1><h2>Preguntas frecuentes</h2>'+
  Array.from({length:6},(_,i)=>'<h3>Pregunta '+i+'</h3><p>Respuesta con ejemplos reales '+i+'</p>').join('');
}
test('FAQ wrapper repair preserves all six original Q and A strings without generation',()=>{
 const html=looseFaq(),r=normalizeFaqMarkup(html);
 assert.equal(r.changed,true);
 assert.equal((r.html.match(/class="faq-item"/g)||[]).length,6);
 assert.ok(r.html.includes('<section class="faq">'));
 for(let i=0;i<6;i++){
  assert.ok(r.html.includes('Pregunta '+i));
  assert.ok(r.html.includes('Respuesta con ejemplos reales '+i));
 }
 assert.equal(normalizeFaqMarkup(r.html).changed,false);
});
test('nonunique FAQ, unsafe nested FAQ and trailing content do not trigger destructive fix',()=>{
 const t=looseFaq();
 assert.equal(normalizeFaqMarkup(t+t).changed,false);
 assert.equal(normalizeFaqMarkup(t+'<div>Otro contenido</div>').changed,false);
 assert.equal(normalizeFaqMarkup(t.replace('Pregunta 2','<strong>Pregunta 2</strong>')).changed,false);
});
test('repair loop feeds detected errors into a second attempt and stops when precheck passes',async()=>{
 let n=0;
 const generate=async({attempt,feedback})=>{
  n++;if(attempt===1)assert.equal(feedback,null);
  else assert.deepEqual(feedback.error_codes,['SIX_MAIN_H2_REQUIRED']);
  return {status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',request_count:1,
   html:attempt===1?looseFaq():'<h1>Gastos en Córdoba</h1><p>'+Array(130).fill('texto').join(' ')+'</p>'};
 };
 const review=({writer})=>writer.html.includes(Array(130).fill('texto').join(' '))?goodQa():badQa();
 const r=await runSelfRepairItem({brief:brief('SEO001-LAB-SELFREPAIR-B2C'),generate,review});
 assert.equal(n,2);
 assert.equal(r.requests,2);
 assert.equal(r.status,'COPY_PRECHECK_PASS_PHYSICAL_HOLD');
 assert.equal(r.full_quality_certified,false);
 assert.equal(r.publish_allowed,false);
 assert.equal(r.attempts[0].deterministic_repair,'WRAPPER_FIXED_PRESERVED_SIX_QA');
 assert.ok(r.physical_gates_pending.includes('INDEPENDENT_YMYL_LEGAL_SIGNOFF'));
});
test('identical repeated failing output stops rather than burning all provider calls',async()=>{
 let calls=0;const generate=async()=>{calls++;return{status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',
   request_count:1,html:looseFaq()}};
 const r=await runSelfRepairItem({brief:brief('SEO001-LAB-SELFREPAIR-REPEAT'),
   generate,review:badQa,maxAttempts:3});
 assert.equal(calls,2);
 assert.equal(r.status,'SELF_REPAIR_EXHAUSTED_OR_PROVIDER_HOLD');
 assert.equal(r.publish_allowed,false);
});
test('provider error or no valid draft fails closed, no blind retry',async()=>{
 let calls=0;const r=await runSelfRepairItem({brief:brief('SEO001-LAB-SELFREPAIR-HTTP'),
  generate:async()=>{calls++;return {status:'HOLD',request_count:1,reason:'HTTP_429'};}});
 assert.equal(calls,1);assert.equal(r.requests,1);
 assert.equal(r.status,'SELF_REPAIR_EXHAUSTED_OR_PROVIDER_HOLD');
 assert.equal(r.content,null);assert.equal(r.publish_allowed,false);
});
test('shared batch ceiling stops next item before any more model calls',async()=>{
 let calls=0;const generate=async()=>{calls++;return {status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',
  request_count:1,html:'<h1>Real test</h1>'+Array(100).fill('palabra').join(' ')};};
 const r=await runSelfRepairBatch({batch_id:'SEO001-SELFREPAIR-20261108-V0',
  briefs:[brief('SEO001-SELF-B2C'),brief('SEO001-SELF-B2B','INMOBILIARIAS')],
  generate,review:badQa,maxRequests:2,maxAttempts:3});
 assert.equal(calls,2);assert.equal(r.model_calls,2);
 assert.equal(r.works.length,2);
 assert.equal(r.works[1].status,'SKIPPED_BATCH_BUDGET');
 assert.equal(r.paid_fallback_calls,0);
 assert.equal(r.wordpress_writes,0);
 assert.equal(r.crm_writes,0);
 assert.equal(r.published,0);
 assert.equal(r.next_batch_auto_allowed,false);
});
test('review cannot claim full quality or publication even with model success',async()=>{
 await assert.rejects(runSelfRepairItem({brief:brief('SEO001-SELF-WRONG-QA'),
  generate:async()=>({status:'REAL_CLOUD_DRAFT_REVIEW_ONLY',request_count:1,
   html:looseFaq()}),
  review:()=>({technical_copy_precheck:'PASS',copy_issues:[],
    full_quality_certified:true,publish_allowed:true})}),/SEO_SELF_REPAIR_UNSAFE_OR_INVALID_QA_GATE/);
});
test('max attempt 4, missing budget and unscoped company are rejected',async()=>{
 assert.equal(SELF_REPAIR_POLICY.attempts_per_item,3);
 await assert.rejects(runSelfRepairItem({brief:brief('A'),
   generate:async()=>({status:'HOLD',request_count:0}),maxAttempts:4}),
  /SEO_SELF_REPAIR_INVALID_SCOPE_OR_BUDGET/);
 await assert.rejects(runSelfRepairBatch({batch_id:'SEO001-SELFREPAIR-20261108-V0',
  briefs:[{...brief('A'),company_id:'other'}],
  generate:async()=>({status:'HOLD',request_count:0}),maxRequests:0}),/BATCH_SCOPE/);
});
test('targeted feedback exposes only error codes, never HTML or contact data',()=>{
 const f=targetedRepairFeedback({copy_issues:['SIX_MAIN_H2_REQUIRED','SIX_MAIN_H2_REQUIRED']});
 assert.deepEqual(f.error_codes,['SIX_MAIN_H2_REQUIRED']);
 assert.equal(f.keep_grounded_sources,true);
});
