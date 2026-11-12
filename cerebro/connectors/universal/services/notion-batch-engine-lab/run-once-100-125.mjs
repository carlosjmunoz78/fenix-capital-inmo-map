// FACT-001: GitHub OIDC owner-signed read-only Notion backup 100→125.
// Never persist cleartext, keys, bearer, page IDs or unencrypted Notion API responses.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deriveNotionNextBatch} from './notion-batch-continuation-guard.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='cerebro/connectors/universal/services/notion-batch-engine-lab/';
const checkpoint=JSON.parse(readFileSync(root+'checkpoints/batch-75-100-composite-d1-cas.v1.json','utf8'));
const v=deriveNotionNextBatch({checkpoint});
const request=JSON.parse(readFileSync(root+'requests/execute-100-125-20261112.v1.json','utf8'));
const expected={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'BACKUP_100_125_ONCE',offset:100,max_items:25,index_sha256:v.index_sha256,previous_zip_sha256:v.previous_zip_sha256,previous_drive_file_id:v.previous_drive_file_id,checkpoint_db_id:v.checkpoint_db_id,checkpoint_offset:100,checkpoint_version:4};
if(JSON.stringify(request)!==JSON.stringify(expected))throw Error('OWNER_ORDER_DENIED');
const target='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-engine-lab';
const dir='fact001-notion-batch-engine-encrypted-100-125';
mkdirSync(dir,{recursive:true});
let planOK=false, sealed=0, failed=null, rows=0,blocks=0,pages=0,sources=0;
const entries=[];
async function oidc(){
 const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!ep||!grant)throw Error('OIDC_UNAVAILABLE');
 const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');
 const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');
 const token=(await r.json()).value;
 if(typeof token!=='string'||token.split('.').length!==3)throw Error('OIDC_INVALID');
 return token;
}
async function call(path,token,body){
 const r=await fetch(target+'/'+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(path.startsWith('plan')?150000:180000)});
 let data={};try{data=await r.json()}catch{}
 return {status:r.status,data};
}
const base={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-100-125-20261112',index_sha256:v.index_sha256,offset:100,max_items:25,previous_zip_sha256:v.previous_zip_sha256,previous_drive_file_id:v.previous_drive_file_id};
try{
 const jwt=await oidc(),req={...base,operation:'notion.lab.batcher.plan_next'};
 const anon=await call('plan-next',null,req),forged=await call('plan-next','invalid-token',req),prod=await call('plan-next',jwt,{...req,environment:'PROD'});
 if(anon.status!==401||forged.status!==401||prod.status!==403)throw Error('NEGATIVE_GATE_DENIED');
 console.log('NOTION_100_125_ANON_401=PASS;FORGED_401=PASS;PROD_403=PASS');
 const response=await call('plan-next',jwt,req),p=response.data;
 if(response.status!==200||p.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||p.offset!==100||p.next_offset!==125||p.items!==25||p.batch_ref!==v.batch_ref||p.index_sha256!==v.index_sha256||p.verify_roundtrip!==true||p.provider_writes!==0||p.envelope?.format!=='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1')throw Error('PLAN_GATE_DENIED_HTTP_'+response.status+'_'+String(p.code||'UNSPECIFIED').slice(0,65).replace(/[^A-Z0-9_]/g,''));
 planOK=true;pages=p.pages;sources=p.data_sources;
 writeFileSync(dir+'/plan.aes256gcm.json',JSON.stringify(p),{flag:'wx',mode:0o600});
 for(let i=0;i<25;i++){
  const result=await call('export-next',jwt,{...base,operation:'notion.lab.batcher.export_next',item_index:i,plan_artifact:p}),x=result.data;
  if(result.status!==200||x.status!=='FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED'||x.batch_ref!==v.batch_ref||x.index_sha256!==v.index_sha256||x.item_index!==i||x.global_offset!==100+i||x.verify_roundtrip!==true||x.provider_writes!==0||x.checkpoint_committed!==false||x.media_binaries_backed_up!==false||x.comments_backed_up!==false||!x.envelope?.ciphertext_b64)throw Error('ITEM_GATE_DENIED_'+i+'_HTTP_'+result.status+'_'+String(x.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
  const bytes=Buffer.from(JSON.stringify(x));writeFileSync(dir+'/object-'+String(i).padStart(2,'0')+'.aes256gcm.json',bytes,{flag:'wx',mode:0o600});
  entries.push({index:i,sha256:sha(bytes),bytes:bytes.length,kind:x.kind,rows:x.row_count,blocks:x.block_count});
  sealed++;rows+=x.row_count||0;blocks+=x.block_count||0;console.log('NOTION_100_125_OBJECT_'+i+'_CIPHERTEXT_SEALED');
 }
}catch(e){
 const raw=e instanceof Error?e.message:'UNKNOWN';
 failed=/^(OIDC_[A-Z0-9_]+|NEGATIVE_GATE_DENIED|PLAN_GATE_DENIED_HTTP_\d+_[A-Z0-9_]+|ITEM_GATE_DENIED_[A-Z0-9_]+)$/.test(raw)?raw:'REQUEST_OR_RUNTIME_BLOCKED';
 console.warn('NOTION_100_125_RESULT='+failed);
}finally{
 writeFileSync(dir+'/proof.json',JSON.stringify({scope:'fenix-capital/FACT-001/LAB/1.0.0',index_sha256:v.index_sha256,offset:100,next_offset:125,expected:25,encrypted_objects:sealed,plan_verified:planOK,pages_planned:pages,sources_planned:sources,rows,blocks,failed,objects:entries,provider_writes:0,checkpoint_committed:false,attachments_backed_up:false,comments_backed_up:false},null,2),{flag:'wx',mode:0o600});
 console.log('NOTION_100_125_SEALED_TOTAL='+sealed+';CHECKPOINT_MOVED=false;NOTION_WRITES=0');
}
if(failed||sealed!==25)process.exitCode=1;
