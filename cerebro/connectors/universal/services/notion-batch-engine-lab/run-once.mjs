// FACT-001 · one explicit owner-signed 50→75 encrypted-only backup. No provider writes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const INDEX='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
const PREVIOUS='d8e93417190470f1d9ed34ffdd40962ff33a869869378b5ee580b1fca1641026';
const PREVIOUS_DRIVE='12UJyaeYukgOlFIHrLlebxLOgLTsdalcq';
const DB='bc085807-a6ca-4c56-a288-fe56716fec6f';
const dir='fact001-notion-batch-engine-encrypted-50-75';mkdirSync(dir,{recursive:true});
const prefix='cerebro/connectors/universal/';
const requestPath=prefix+'services/notion-batch-engine-lab/requests/execute-20261111.v1.json';
const order=JSON.parse(readFileSync(requestPath,'utf8'));
const exact={...scope,action:'BACKUP_50_75_ONCE',offset:50,max_items:25,index_sha256:INDEX,previous_zip_sha256:PREVIOUS,previous_drive_file_id:PREVIOUS_DRIVE,checkpoint_db_id:DB,checkpoint_offset:50,checkpoint_version:2};
if(JSON.stringify(order)!==JSON.stringify(exact))throw Error('OWNER_ORDER_DENIED');
const c=JSON.parse(readFileSync(prefix+'services/notion-content-export-v2-lab/checkpoints/second-25-mixed-content-readback.v1.json','utf8'));
const e=JSON.parse(readFileSync(prefix+'services/notion-checkpoint-cas-lab/evidence/physical-checkpoint-and-restore-20261111.v1.json','utf8'));
if(c.status!=='SECOND_25_MIXED_CONTENT_ENCRYPTED_OFFSITE_READBACK_VERIFIED'||c.content_next_offset!==50||c.github?.sha256!==PREVIOUS||c.drive?.readback_sha256!==PREVIOUS||c.drive?.exact_match!==true||c.source_index_sha256!==INDEX||e.database?.uuid!==DB||e.checkpoint?.final?.offset!==50||e.checkpoint?.final?.cas_version!==2||e.checkpoint?.final?.sha256!==PREVIOUS||e.physical_time_travel?.restored_to_offset25!==true||e.physical_time_travel?.reapplied_cas50!==true)throw Error('PREVIOUS_LAB_OFFSITE_AND_CAS_GATE_DENIED');
const base={...scope,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-20261111',index_sha256:INDEX,offset:50,max_items:25,previous_zip_sha256:PREVIOUS,previous_drive_file_id:PREVIOUS_DRIVE};
const target='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-engine-lab';
let planVerified=false,count=0,error=null;let rows=0,blocks=0,pages=0,sources=0,proof=[];
async function oidc(){const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!ep||!grant)throw Error('OIDC_UNAVAILABLE');const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},redirect:'manual',signal:AbortSignal.timeout(12000)});if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');const jwt=(await r.json()).value;if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_MALFORMED');return jwt;}
async function call(route,token,body){const r=await fetch(target+'/'+route,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(route==='plan'?150000:180000)});let data={};try{data=await r.json()}catch{}return {code:r.status,data};}
try{
 const jwt=await oidc();const planReq={...base,operation:'notion.lab.batcher.plan'};
 const anon=await call('plan',null,planReq),forged=await call('plan','invalid-token',planReq),prod=await call('plan',jwt,{...planReq,environment:'PROD'});
 if(anon.code!==401||forged.code!==401||prod.code!==403)throw Error('OIDC_NEGATIVE_GATES_DENIED');
 console.log('FACT001_BATCH_50_75_ANON_401=PASS');console.log('FACT001_BATCH_50_75_FORGED_401=PASS');console.log('FACT001_BATCH_50_75_PROD_403=PASS');
 const v=await call('plan',jwt,planReq),p=v.data;const expectedRef=hash(INDEX+':50:75');
 if(v.code!==200||p.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||p.batch_ref!==expectedRef||p.index_sha256!==INDEX||p.offset!==50||p.next_offset!==75||p.items!==25||p.pages+p.data_sources!==25||p.verify_roundtrip!==true||p.provider_writes!==0||p.content_downloaded!==false||p.envelope?.format!=='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1'||!p.envelope?.ciphertext_b64)throw Error('PLAN_GATE_HTTP_'+v.code+'_'+String(p.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
 planVerified=true;pages=p.pages;sources=p.data_sources;
 writeFileSync(dir+'/plan.aes256gcm.json',JSON.stringify(p),{flag:'wx',mode:0o600});
 console.log('FACT001_BATCH_50_75_PLAN_VERIFIED=PASS');console.log('FACT001_BATCH_50_75_PAGES='+pages);console.log('FACT001_BATCH_50_75_SOURCES='+sources);
 for(let i=0;i<25;i++){
  const r=await call('export',jwt,{...base,operation:'notion.lab.batcher.export',item_index:i,plan_artifact:p}),x=r.data;
  if(r.code!==200||x.status!=='FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED'||x.batch_ref!==expectedRef||x.index_sha256!==INDEX||x.item_index!==i||x.global_offset!==50+i||x.verify_roundtrip!==true||!['page','data_source'].includes(x.kind)||x.provider_writes!==0||x.checkpoint_committed!==false||x.media_binaries_backed_up!==false||x.comments_backed_up!==false||!x.envelope?.ciphertext_b64)throw Error('ITEM_BLOCKED_'+i+'_HTTP_'+r.code+'_'+String(x.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
  const bytes=Buffer.from(JSON.stringify(x));writeFileSync(dir+'/object-'+String(i).padStart(2,'0')+'.aes256gcm.json',bytes,{flag:'wx',mode:0o600});
  proof.push({index:i,status:'SEALED_AND_MEMORY_REBUILT',kind:x.kind,rows:x.row_count,blocks:x.block_count,sha256:hash(bytes),bytes:bytes.length});count++;rows+=x.row_count||0;blocks+=x.block_count||0;
  console.log('FACT001_BATCH_50_75_INDEX_'+i+'=SEALED');
 }
}catch(e){const raw=e instanceof Error?e.message:'UNKNOWN';error=/^(OIDC_[A-Z0-9_]+|PLAN_GATE_HTTP_[A-Z0-9_]+|ITEM_BLOCKED_[A-Z0-9_]+|PREVIOUS_LAB_OFFSITE_AND_CAS_GATE_DENIED|OWNER_ORDER_DENIED)$/.test(raw)?raw:'UNEXPECTED_NETWORK_OR_RUNTIME';console.log('FACT001_BATCH_50_75_FAILURE='+error);}
finally{writeFileSync(dir+'/proof.json',JSON.stringify({status:count===25&&!error?'BATCH_50_75_ENCRYPTED_ONLY':'PARTIAL_OR_BLOCKED',scope,offset:50,next_offset:75,expected:25,sealed:count,plan_verified:planVerified,pages_planned:pages,sources_planned:sources,rows_in_sealed_items:rows,blocks_in_sealed_items:blocks,failed:error,provider_writes:0,checkpoint_committed:false,media_binaries_included:false,comments_included:false,items:proof},null,2),{flag:'wx',mode:0o600});console.log('FACT001_BATCH_50_75_CIPHERTEXT_OBJECTS='+count);console.log('FACT001_BATCH_50_75_CHECKPOINT_MOVED=false');console.log('FACT001_BATCH_50_75_PROVIDER_WRITES=0');}
if(count!==25||error)process.exitCode=1;