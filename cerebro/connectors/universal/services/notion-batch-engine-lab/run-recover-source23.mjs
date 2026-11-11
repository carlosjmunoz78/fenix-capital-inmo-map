// FACT-001 · signed recovery of ONLY the heavy data-source at global offset 98 (batch75–100,index23).
// Every piece and continuation is encrypted with Vault key inside CEREBRO LAB; GitHub never sees source IDs or secrets.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const root='cerebro/connectors/universal/services/notion-batch-engine-lab/';
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const INDEX='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca';
const PREV='5ad72bef9789927e0caab76ad1f907d7cdef4583d3d2c556c6c5c7ef04bc187f';
const PARTIAL='642f2f933d00b5b020aedf5dd69639f66d8c7e0754a5481e93320c66b737fd18';
const LAST_PAGE='cce23767fc9752d76bb38d038f7f6425815aebdc4202767252c90fc217edfe40';
const partProof=JSON.parse(readFileSync(root+'checkpoints/batch-75-100-partial-23.v1.json','utf8'));
const pageProof=JSON.parse(readFileSync(root+'checkpoints/recover-index24.v1.json','utf8'));
const order=JSON.parse(readFileSync(root+'requests/recover-source23-20261111.v1.json','utf8'));
const exact={...scope,action:'RECOVER_75_100_SOURCE23_CHUNKS_ONCE',offset:75,max_items:25,item_index:23,index_sha256:INDEX,previous_zip_sha256:PREV,partial_zip_sha256:PARTIAL,recovered_page24_sha256:LAST_PAGE,checkpoint_db_id:'bc085807-a6ca-4c56-a288-fe56716fec6f',checkpoint_offset:75,checkpoint_version:3};
if(JSON.stringify(order)!==JSON.stringify(exact)||partProof.status!=='PARTIAL_23_OF_25_OFFSITE_VERIFIED'||partProof.github?.sha256!==PARTIAL||partProof.items_sealed!==23||partProof.drive?.exact_match!==true||pageProof.status!=='INDEX24_OFFSITE_AES256GCM_VERIFIED'||pageProof.github?.sha256!==LAST_PAGE||pageProof.drive?.readback_sha256!==LAST_PAGE||pageProof.block_count!==178||pageProof.checkpoint_moved!==false)throw Error('OWNER_SOURCE_RECOVERY_SCOPE_DENIED');
const base={...scope,client_id:'cerebro',source:'owner_order',request_id:'FACT001-NOTION-BATCH-ENGINE-75-100-20261111',index_sha256:INDEX,offset:75,max_items:25,previous_zip_sha256:PREV,previous_drive_file_id:'1l68TceZpyar7jOoTZI5Nr5OUy4D8-XOg'};
const host='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-engine-lab';
const dir='fact001-notion-75-100-source23-chunks-ciphertext';mkdirSync(dir,{recursive:true});
async function oidc(){const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!ep||!grant)throw Error('OIDC_UNAVAILABLE');const res=await fetch(ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1'),{headers:{Authorization:'Bearer '+grant},redirect:'manual',signal:AbortSignal.timeout(12000)});if(res.status!==200)throw Error('OIDC_ISSUER_DENIED');const token=(await res.json()).value;if(typeof token!=='string'||token.split('.').length!==3)throw Error('OIDC_MALFORMED');return token;}
async function call(route,token,body){const res=await fetch(host+'/'+route,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(route==='plan'?150000:75000)});let json={};try{json=await res.json()}catch{}return {status:res.status,json};}
let count=0,complete=false,error=null,totalRows=0,totalBlocks=0,totalRequests=0,entries=[],planVerified=false;
try{
 const jwt=await oidc(),basePlan={...base,operation:'notion.lab.batcher.plan'};
 const [anon,forged,prod]=await Promise.all([call('plan',null,basePlan),call('plan','forged-jwt',basePlan),call('plan',jwt,{...basePlan,environment:'PROD'})]);
 if(anon.status!==401||forged.status!==401||prod.status!==403)throw Error('OIDC_NEGATIVE_GATES_DENIED');
 console.log('FACT001_SOURCE23_NEGATIVE_GATES=PASS');
 const v=await call('plan',jwt,basePlan),plan=v.json,expectedRef=hash(INDEX+':75:100');
 if(v.status!==200||plan.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||plan.batch_ref!==expectedRef||plan.index_sha256!==INDEX||plan.offset!==75||plan.next_offset!==100||plan.items!==25||plan.pages!==24||plan.data_sources!==1||plan.verify_roundtrip!==true||plan.provider_writes!==0||!plan.envelope?.ciphertext_b64)throw Error('PLAN_GATE_HTTP_'+v.status);
 planVerified=true;writeFileSync(dir+'/plan.aes256gcm.json',JSON.stringify(plan),{flag:'wx',mode:0o600});console.log('FACT001_SOURCE23_PLAN_VERIFIED=PASS');
 let continuation=null;for(let i=0;i<150;i++){
  const jwt=await oidc();const request={...base,operation:'notion.lab.batcher.source.chunk',item_index:23,plan_artifact:plan,continuation};
  const res=await call('source-chunk',jwt,request),x=res.json;
  if(res.status!==200||x.status!=='FACT001_NOTION_SOURCE_CHUNK_SEALED'||x.index_sha256!==INDEX||x.batch_ref!==expectedRef||x.item_index!==23||x.global_offset!==98||x.part!==i||x.verify_roundtrip!==true||x.provider_writes!==0||x.checkpoint_committed!==false||x.media_binaries_backed_up!==false||x.comments_backed_up!==false||!x.envelope?.ciphertext_b64||x.source_complete!== (x.continuation===null))throw Error('CHUNK_GATE_'+i+'_HTTP_'+res.status+'_'+String(x.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
  if(x.total_rows<totalRows||x.total_blocks<totalBlocks||x.total_requests<totalRequests)throw Error('CHUNK_COUNTER_ROLLBACK');
  const serialized=Buffer.from(JSON.stringify(x));if(serialized.length>1800000)throw Error('CHUNK_TOO_LARGE');
  writeFileSync(dir+'/part-'+String(i).padStart(3,'0')+'.aes256gcm.json',serialized,{flag:'wx',mode:0o600});count++;totalRows=x.total_rows;totalBlocks=x.total_blocks;totalRequests=x.total_requests;
  entries.push({part:i,bytes:serialized.length,sha256:hash(serialized),rows_in_part:x.rows_in_part,blocks_in_part:x.blocks_in_part});
  console.log('FACT001_SOURCE23_PART_'+i+'=SEALED');
  if(x.source_complete){complete=true;break;}
  continuation=x.continuation;
 }
 if(!complete)throw Error('SOURCECHUNK_PARTS_LIMIT');
}catch(e){const raw=e instanceof Error?e.message:'UNKNOWN';error=/^(OIDC_[A-Z0-9_]+|PLAN_GATE_HTTP_[0-9]+|CHUNK_GATE_[A-Z0-9_]+|CHUNK_COUNTER_ROLLBACK|CHUNK_TOO_LARGE|SOURCECHUNK_PARTS_LIMIT|OWNER_SOURCE_RECOVERY_SCOPE_DENIED)$/.test(raw)?raw:'SOURCECHUNK_RUNTIME_DENIED';console.log('FACT001_SOURCE23_FAILURE='+error);}
finally{writeFileSync(dir+'/proof.json',JSON.stringify({status:complete&&!error?'SOURCE23_ENCRYPTED_CHUNK_TREE_COMPLETE':'SOURCE23_PARTIAL_OR_BLOCKED',scope,offset:75,next_offset:100,item_index:23,plan_verified:planVerified,parts_sealed:count,source_complete:complete,rows:totalRows,blocks:totalBlocks,api_requests:totalRequests,failed:error,source_partial_zip_sha256:PARTIAL,source_page24_sha256:LAST_PAGE,provider_writes:0,checkpoint_moved:false,media_binaries_backed_up:false,comments_backed_up:false,parts:entries},null,2),{flag:'wx',mode:0o600});console.log('FACT001_SOURCE23_PARTS='+count);console.log('FACT001_SOURCE23_COMPLETE='+complete);console.log('FACT001_SOURCE23_CHECKPOINT_MOVED=false');}
if(!complete||error)process.exitCode=1;