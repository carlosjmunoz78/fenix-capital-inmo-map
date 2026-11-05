import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {attachSeoOfficialDraftReadIngressLab} from '../runtime/seo-official-wp-read-ingress-lab-v0.mjs';
const ORIGIN='https://fenixcapital.es';
const html='<h2>Antes de visitar una vivienda en Cordoba</h2>'+('<p>Revisa comunidad, documentación, gastos y situación financiera.</p>').repeat(7)+
 '<a href="https://fenixcapital.es/precio-maximo/">Calcula el presupuesto</a>';
const post={ID:52656,type:'post',status:'draft',title:'Checklist para visitar un piso en Córdoba antes de pedir una hipoteca',
 slug:'checklist-visitar-piso-cordoba-antes-hipoteca',permalink:ORIGIN+'/?p=52656',content:html};
const seo={post_id:52656,post_status:'draft',seo_title:'Checklist para visitar un piso en Córdoba | Fénix Capital',
 meta_description:'Qué revisar antes de visitar un piso en Córdoba y cómo preparar los gastos y la financiación antes de tomar decisiones.',focus_keyphrase:'visitar un piso en Córdoba'};
const attested={verified:true,company_id:'fenix',site_origin:ORIGIN,access:'READ_ONLY',
 provider:'CONNECTED_WORDPRESS',assurance:'SERVER_VERIFIED',session_active:true};
function fixture(t,{auth=async()=>attested,readPost=async()=>post,readYoast=async()=>[seo]}={}){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'wp-ingress-v0-'));
 t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const job_journal_path=path.join(folder,'review-queue.v8');
 const actionGateway=new ActionGatewayV1();
 const ingress=attachSeoOfficialDraftReadIngressLab({actionGateway,
  verifyTrustedWordPressConnector:auth,readPost,readYoast,job_journal_path});
 return {ingress,actionGateway,job_journal_path};
}
test('verified existing connected WordPress read → Action Gateway → durable JOB-001 review, no publication',async t=>{
 let reads=0,seoReads=0,authCalls=0;
 const {ingress,actionGateway,job_journal_path}=fixture(t,{
  auth:async input=>{
   authCalls++;assert.deepEqual(input,{company_id:'fenix',site_origin:ORIGIN,required_access:'READ_ONLY'});return attested;
  },
  readPost:async input=>{reads++;assert.equal(input.purpose,'READ_POST_DRAFT');assert.equal(input.post_id,52656);return post},
  readYoast:async input=>{seoReads++;assert.equal(input.purpose,'READ_YOAST_META');return [seo]}
 });
 const first=await ingress.observe({post_id:52656});
 assert.equal(first.status,'ACTION_EXECUTED');
 assert.equal(first.result.status,'WP_OFFICIAL_DRAFT_REVIEW_RECEIVED_LAB');
 assert.equal(first.result.wordpress_write,false);
 assert.equal(first.result.publish_authorized,false);
 assert.equal(first.result.publication_counted_for_autonomy,0);
 assert.equal(reads,1);assert.equal(seoReads,1);assert.equal(authCalls,1);
 const second=await ingress.observe({post_id:52656});
 assert.equal(second.result.duplicate,true);
 assert.equal(second.result.job_id,first.result.job_id);
 const job=new DurableJobRuntimeV1({file_path:job_journal_path});
 const jobs=job.listForContext({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'});
 assert.equal(jobs.length,1);assert.equal(jobs[0].status,'QUEUED');
 assert.equal(jobs[0].payload.permission_to_publish,false);
 assert.equal(jobs[0].payload.owner_approval_count_for_autonomy,0);
 assert.equal(JSON.stringify(jobs).includes(html),false);
 assert.equal(JSON.stringify(actionGateway.auditLog()).includes(html),false);
});
test('fake owner, untrusted direct Gateway caller, fabricated content and tenant fail closed',async t=>{
 const {ingress,actionGateway,job_journal_path}=fixture(t);
 const direct=await actionGateway.execute({context:{company_id:'fenix',engine_id:'ACTGW-001',
  environment:'PREPROD',version:'0.1.0'},capability:ingress.capability,
  idempotency_key:'untrusted-direct-1',authorized:true,risk:'LOW',
  payload:{ticket:'forged',post_id:52656,owner:true,publish:true}});
 assert.equal(direct.status,'HUMAN_REQUIRED');
 assert.equal(direct.executed,false);
 for(const params of [{company_id:'other',post_id:52656},
  {site_origin:'https://staging.fenixcapital.es',post_id:52656},
  {post_id:-1},{post_id:52656,event_kind:'PUBLISH'}]){
  const denied=await ingress.observe(params);
  assert.equal(denied.status,'HUMAN_REQUIRED');
  assert.equal(denied.executed,false);
 }
 assert.equal(new DurableJobRuntimeV1({file_path:job_journal_path}).operation_count,0);
});
test('unverified WordPress connector identity or provider unavailable never re-fetches',async t=>{
 let readCalls=0;
 const {ingress,job_journal_path}=fixture(t,{auth:async()=>({...attested,verified:false}),
  readPost:async()=>{readCalls++;return post}});
 const denied=await ingress.observe({post_id:52656});
 assert.equal(denied.status,'HUMAN_REQUIRED');
 assert.equal(readCalls,0);
 assert.equal(new DurableJobRuntimeV1({file_path:job_journal_path}).operation_count,0);
});
test('provider returns published, wrong post, or SEO without metadata: reject with no queue writes',async t=>{
 const changedPost=fixture(t,{readPost:async()=>({...post,status:'publish'})});
 const result=await changedPost.ingress.observe({post_id:52656});
 assert.equal(result.status,'HUMAN_REQUIRED');
 assert.equal(result.reason,'LOW_CONFIDENCE');
 assert.equal(new DurableJobRuntimeV1({file_path:changedPost.job_journal_path}).operation_count,0);
 const mismatched=fixture(t,{readPost:async()=>({...post,ID:99999})});
 const rebinding=await mismatched.ingress.observe({post_id:52656});
 assert.equal(rebinding.status,'HUMAN_REQUIRED');
 assert.equal(rebinding.reason,'POLICY_CONFLICT');
 assert.equal(new DurableJobRuntimeV1({file_path:mismatched.job_journal_path}).operation_count,0);
 const noSeo=fixture(t,{readYoast:async()=>({...seo,seo_title:null})});
 const denied=await noSeo.ingress.observe({post_id:52656});
 assert.equal(denied.status,'HUMAN_REQUIRED');
 assert.equal(new DurableJobRuntimeV1({file_path:noSeo.job_journal_path}).operation_count,0);
});
test('ingress never registers PROD capability nor can unbound provider self-authorize',()=>{
 assert.throws(()=>attachSeoOfficialDraftReadIngressLab({actionGateway:new ActionGatewayV1()}),/SEO_WP_TRUSTED_READ_PROVIDER_REQUIRED/);
 assert.throws(()=>new ActionGatewayV1({environment:'PROD'}),/PREPROD-only/);
});
