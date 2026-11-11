// FACT-001 isolated one-shot salvage for index 24 from an already signed 75→100 plan.
// No Notion writes; does not replay the previously archived 0..22 ciphertexts; D1 unchanged.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
const root='cerebro/connectors/universal/services/notion-batch-engine-lab/';
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const INDEX='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
const PRIOR='5ad72bef9789927e0caab76ad1f907d7cdef4583d3d2c556c6c5c7ef04bc187f';
const PARTIAL='642f2f933d00b5b020aedf5dd69639f66d8c7e0754a5481e93320c66b737fd18';
const partial=JSON.parse(readFileSync(root+'checkpoints/batch-75-100-partial-23.v1.json','utf8'));
const order=JSON.parse(readFileSync(root+'requests/recover-index24-20261111.v1.json','utf8'));
const exact={...scope,action:'RECOVER_75_100_INDEX_24_ONCE',offset:75,max_items:25,item_index:24,index_sha256:INDEX,previous_zip_sha256:PRIOR,partial_zip_sha256:PARTIAL,partial_drive_id:'1MeUf70NJ6l2URxIjeYy9jO_5JPeYTh8x',checkpoint_db_id:'bc085807-a6ca-4c56-a288-fe56716fec6f',checkpoint_offset:75,checkpoint_version:3};
if(JSON.stringify(order)!==JSON.stringify(exact)||partial.status!=='PARTIAL_23_OF_25_OFFSITE_VERIFIED'||partial.github?.sha256!==PARTIAL||partial.drive?.readback_sha256!==PARTIAL||partial.items_sealed!==23||partial.batch_start_offset!==75||partial.batch_next_offset!==100||partial.last_checkpoint_offset!==75||partial.last_checkpoint_version!==3)throw Error('OWNER_PARTIAL_CAS_GATES_DENIED');
const base={...scope,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-75-100-20261111',index_sha256:INDEX,offset:75,max_items:25,previous_zip_sha256:PRIOR,previous_drive_file_id:'1l68TceZpyar7jOoTZI5Nr5OUy4D8-XOg'};
const endpoint='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-engine-lab';
const dir='fact001-notion-batch-75-100-recover-index24-ciphertext';mkdirSync(dir,{recursive:true});
async function oidc(){const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,t=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!ep||!t)throw Error('OIDC_UNAVAILABLE');const r=await fetch(ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1'),{headers:{Authorization:'Bearer '+t},redirect:'manual',signal:AbortSignal.timeout(12000)});if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');const v=(await r.json()).value;if(typeof v!=='string'||v.split('.').length!==3)throw Error('OIDC_MALFORMED');return v;}
async function call(route,jwt,payload){const r=await fetch(endpoint+'/'+route,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(payload),redirect:'manual',signal:AbortSignal.timeout(route==='plan'?150000:180000)});let data={};try{data=await r.json()}catch{}return {status:r.status,data};}
let count=0,err=null,kind=null,rows=0,blocks=0;
try{
 const jwt=await oidc();const req={...base,operation:'notion.lab.batcher.plan'};
 const a=await call('plan',null,req),f=await call('plan','fake',req),pr=await call('plan',jwt,{...req,environment:'PROD'});
 if(a.status!==401||f.status!==401||pr.status!==403)throw Error('OIDC_NEGATIVE_GATES_DENIED');
 console.log('FACT001_RECOVER24_NEGATIVE_GATES=PASS');
 const p=await call('plan',jwt,req),plan=p.data,ref=hash(INDEX+':75:100');
 if(p.status!==200||plan.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||plan.batch_ref!==ref||plan.offset!==75||plan.next_offset!==100||plan.items!==25||plan.pages!==24||plan.data_sources!==1||plan.verify_roundtrip!==true||plan.provider_writes!==0||!plan.envelope?.ciphertext_b64)throw Error('RECOVER24_PLAN_DENIED_'+p.status);
 writeFileSync(dir+'/plan.aes256gcm.json',JSON.stringify(plan),{flag:'wx',mode:0o600});
 const r=await call('export',jwt,{...base,operation:'notion.lab.batcher.export',item_index:24,plan_artifact:plan}),x=r.data;
 if(r.status!==200||x.status!=='FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED'||x.batch_ref!==ref||x.index_sha256!==INDEX||x.item_index!==24||x.global_offset!==99||x.verify_roundtrip!==true||x.provider_writes!==0||x.checkpoint_committed!==false||x.media_binaries_backed_up!==false||x.comments_backed_up!==false||!x.envelope?.ciphertext_b64)throw Error('RECOVER24_ITEM_DENIED_'+r.status+'_'+String(x.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
 const bytes=Buffer.from(JSON.stringify(x));writeFileSync(dir+'/object-24.aes256gcm.json',bytes,{flag:'wx',mode:0o600});count=1;kind=x.kind;rows=x.row_count;blocks=x.block_count;
 console.log('FACT001_RECOVER24_ITEM=SEALED_AND_MEMORY_REBUILT');
}catch(e){const raw=e instanceof Error?e.message:'UNEXPECTED';err=/^(OIDC_[A-Z0-9_]+|RECOVER24_[A-Z0-9_]+|OWNER_PARTIAL_CAS_GATES_DENIED)$/.test(raw)?raw:'RECOVER24_RUNTIME_DENIED';console.log('FACT001_RECOVER24_FAILURE='+err);}
finally{writeFileSync(dir+'/proof.json',JSON.stringify({status:count===1&&!err?'RECOVER_INDEX24_AES256GCM_SUCCESS':'RECOVER_INDEX24_BLOCKED',scope,offset:75,next_offset:100,index:24,sealed:count,kind,rows,blocks,failed:err,source_partial_zip_sha256:PARTIAL,source_partial_drive_id:'1MeUf70NJ6l2URxIjeYy9jO_5JPeYTh8x',checkpoint_moved:false,provider_writes:0},null,2),{flag:'wx',mode:0o600});console.log('FACT001_RECOVER24_SEALED='+count);console.log('FACT001_RECOVER24_CHECKPOINT_MOVED=false');}
if(count!==1||err)process.exitCode=1;