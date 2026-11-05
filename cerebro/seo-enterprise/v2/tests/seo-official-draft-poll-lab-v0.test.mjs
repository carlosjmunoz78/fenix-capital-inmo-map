import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {attachSeoOfficialDraftReadIngressLab} from '../runtime/seo-official-wp-read-ingress-lab-v0.mjs';
import {scanSeoOfficialDraftsLab} from '../runtime/seo-official-draft-poll-lab-v0.mjs';
const SITE='https://fenixcapital.es';
const html='<h2>Draft content</h2>'+('<p>Lista completa de preguntas antes de comprar una casa en Córdoba.</p>').repeat(8);
const items=[
 {ID:52656,type:'post',status:'draft',slug:'checklist-visitar-piso-cordoba-antes-hipoteca'},
 {ID:52248,type:'post',status:'draft',slug:'cuando-preparar-hipoteca-compra-jaen'},
 {ID:51000,type:'post',status:'draft',slug:'archive-cordoba-legacy'}
];
const att={verified:true,company_id:'fenix',site_origin:SITE,
 access:'READ_ONLY',provider:'CONNECTED_WORDPRESS',assurance:'SERVER_VERIFIED',session_active:true};
function setup(t,{override={},listOverride=null}={}){
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'wp-readonly-scan-'));
 t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 const file_path=path.join(d,'job001-review.v8'),gw=new ActionGatewayV1();
 const ingress=attachSeoOfficialDraftReadIngressLab({actionGateway:gw,job_journal_path:file_path,
  verifyTrustedWordPressConnector:async()=>att,
  readPost:async({post_id})=>{
   const it=items.find(x=>x.ID===post_id)||{...items[0],ID:post_id,slug:'borrador-seo-cordoba-'+post_id};
   return {...it,type:'post',title:'Checklist de compra de vivienda en Cordoba',permalink:SITE+'/?p='+post_id,content:html,...override};
  },
  readYoast:async({post_id})=>({post_id,post_status:'draft',seo_title:'Checklist para visitar un piso en Córdoba | Fénix Capital',
   meta_description:'Una checklist para conocer los gastos, la hipoteca, el edificio y las preguntas que debes realizar al vendedor.',focus_keyphrase:'visitar un piso en Córdoba'})
 });
 const listDrafts=listOverride??(async q=>{
  assert.equal(q.post_type,'post');assert.equal(q.status,'draft');
  assert.equal(q.purpose,'SEO_REVIEW_READ_ONLY');
  assert.ok(q.per_page<=20);
  return {posts:items,total:items.length};
 });
 return {ingress,file_path,gw,listDrafts};
}
test('live-shaped inventory triggers official authenticated reads, two durable review jobs, legacy held and no production writes',async t=>{
 const f=setup(t);
 const scan=await scanSeoOfficialDraftsLab(f);
 assert.equal(scan.state,'LAB_READONLY_DRAFT_INVENTORY_SCANNED');
 assert.equal(scan.scanned,3);
 assert.equal(scan.review_jobs.length,2);
 assert.equal(scan.posts_reviewed_new,2);
 assert.equal(scan.historical_held.length,1);
 assert.equal(scan.wordpress_writes,0);
 assert.equal(scan.publications,0);
 assert.equal(scan.prod_bridge_activated,false);
 const again=await scanSeoOfficialDraftsLab(f);
 assert.equal(again.posts_reviewed_new,0);
 assert.equal(again.posts_reviewed_duplicate,2);
 const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'0.1.0'};
 const rt=new DurableJobRuntimeV1({file_path:f.file_path});
 const jobs=rt.listForContext(ctx);
 assert.equal(jobs.length,2);
 assert.equal(jobs[0].payload.desired_wordpress_status,'draft');
 assert.equal(jobs[0].payload.permission_to_publish,false);
 assert.equal(JSON.stringify(scan).includes(html),false);
 assert.equal(JSON.stringify(jobs).includes(html),false);
});
test('site/tenant mismatch, overlarge batch and missing trusted reader fail closed',async t=>{
 const f=setup(t);
 assert.equal((await scanSeoOfficialDraftsLab({...f,company_id:'other'})).reason,'SCOPE_MISMATCH');
 assert.equal((await scanSeoOfficialDraftsLab({...f,site_origin:'https://staging.fenixcapital.es'})).reason,'SCOPE_MISMATCH');
 assert.equal((await scanSeoOfficialDraftsLab({...f,max_items:21})).reason,'LIMIT_INVALID');
 assert.equal((await scanSeoOfficialDraftsLab({...f,listDrafts:null})).reason,'TRUSTED_READER_UNBOUND');
 assert.equal(new DurableJobRuntimeV1({file_path:f.file_path}).operation_count,0);
});
test('fabricated posts or invalid WordPress draft inventory never queues',async t=>{
 for(const input of [
  {posts:[{...items[0],status:'publish'}],total:1},
  {posts:[items[0],items[0]],total:2},
  {posts:[{...items[0],type:'page'}],total:1},
  {posts:[{...items[0],ID:-9}],total:1},
  {posts:[],total:-4},
  {posts:[],total:1.1},
  {posts:'not-list',total:1}
 ]){
  const f=setup(t,{listOverride:async()=>input});
  const result=await scanSeoOfficialDraftsLab(f);
  assert.equal(result.state,'BLOCKED');
  assert.equal(new DurableJobRuntimeV1({file_path:f.file_path}).operation_count,0);
 }
});
test('read-only scan rejects published post discovered after listing without overwriting WordPress',async t=>{
 const f=setup(t,{override:{status:'publish'},listOverride:async()=>({posts:[items[0]],total:1})});
 const r=await scanSeoOfficialDraftsLab(f);
 assert.equal(r.rejected.length,1);
 assert.equal(r.review_jobs.length,0);
 assert.equal(r.wordpress_writes,0);
 assert.equal(new DurableJobRuntimeV1({file_path:f.file_path}).operation_count,0);
});
test('inventory capped to twenty and incomplete pagination explicitly disclosed',async t=>{
 const many=Array.from({length:20},(_,i)=>({...items[0],ID:53000+i,slug:'borrador-seo-cordoba-'+i}));
 const f=setup(t,{listOverride:async ({per_page})=>{
  assert.equal(per_page,20);return {posts:many,total:37};
 }});
 const r=await scanSeoOfficialDraftsLab(f);
 assert.equal(r.state,'LAB_READONLY_DRAFT_INVENTORY_SCANNED');
 assert.equal(r.total_wordpress_drafts,37);
 assert.equal(r.truncated,true);
 assert.equal(r.scanned,20);
 assert.equal(r.review_jobs.length,20);
 assert.equal(r.pages_not_processed,true);
 assert.equal(r.publications,0);
});
