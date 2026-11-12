// FACT-001 · isolated one-shot second 25 plan with in-service index parity. No plaintext in runner.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ORDER,PREVIOUS_SHA,INDEX_SHA} from './order.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const file='cerebro/connectors/universal/services/notion-batch-planner-v2-lab/requests/execute-20261111.v1.json';
const orderFile=JSON.parse(readFileSync(file,'utf8'));
const exact={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'PLAN_SECOND_25_FROM_LIVE_INDEX_ONCE',offset:25,max_items:25,checkpoint_move:false};
if(JSON.stringify(exact)!==JSON.stringify(orderFile))throw Error('OWNER_ORDER_DENIED');
const cp=JSON.parse(readFileSync('cerebro/connectors/universal/services/notion-content-export-lab/checkpoints/first-25-content-readback.v1.json','utf8'));
if(cp.status!=='FIRST_25_CONTENT_ENCRYPTED_OFFSITE_READBACK_VERIFIED'||cp.content_next_offset!==25||cp.items_sealed!==25||cp.github?.sha256!==PREVIOUS_SHA||cp.drive?.readback_sha256!==PREVIOUS_SHA||cp.d1_cas_checkpoint_committed!==false)throw Error('PRIOR_BACKUP_DENIED');
const output='fact001-notion-second-25-plan-v2';mkdirSync(output,{recursive:true});
let good=false,info={};
async function oidc(){const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!ep||!token)throw Error('OIDC_MISSING');const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');const r=await fetch(u,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(12000)});if(r.status!==200)throw Error('OIDC_HTTP_'+r.status);const jwt=(await r.json()).value;if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_BAD');return jwt;}
async function call(jwt,body,timeout=15000){const r=await fetch('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-planner-v2-lab/plan',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(timeout)});let data={};try{data=await r.json()}catch{}return {http:r.status,data};}
try{
 const jwt=await oidc();
 const [anon,fake,prod]=await Promise.all([call(null,ORDER),call('forged',ORDER),call(jwt,{...ORDER,environment:'PROD'})]);
 if(anon.http!==401||fake.http!==401||prod.http!==403)throw Error('OIDC_NEGATIVE_GATE_DENIED');
 console.log('FACT001_BATCH2_V2_ANON_401=PASS');console.log('FACT001_BATCH2_V2_FORGED_401=PASS');console.log('FACT001_BATCH2_V2_PROD_403=PASS');
 const r=await call(jwt,ORDER,240000),x=r.data,expected=sha(INDEX_SHA+':25:50');
 if(r.http!==200||x.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||x.verify_roundtrip!==true||x.batch_ref!==expected||x.offset!==25||x.next_offset!==50||x.items!==25||x.pages+x.data_sources!==25||x.search_index_sha256_matches_previous!==true||x.source_objects!==6632||!Number.isInteger(x.source_index_search_calls)||x.source_index_search_calls<1||x.source_index_search_calls>85||x.provider_writes!==0||x.content_backed_up!==false||x.checkpoint_committed!==false||!x.envelope?.ciphertext_b64)throw Error('BATCH2_V2_RESPONSE_DENIED_'+r.http+'_'+String(x.code||'NONE').replace(/[^A-Z0-9_]/g,''));
 writeFileSync(output+'/second-25-notion-batch-plan.aes256gcm.json',JSON.stringify(x),{flag:'wx',mode:0o600});
 info={offset:25,next_offset:50,pages:x.pages,data_sources:x.data_sources,batch_ref:x.batch_ref,index_search_calls:x.source_index_search_calls};good=true;
 console.log('FACT001_BATCH2_V2_ENCRYPTED_PLAN=PASS');console.log('FACT001_BATCH2_V2_PAGES='+x.pages);console.log('FACT001_BATCH2_V2_DATA_SOURCES='+x.data_sources);
}catch(e){const raw=e instanceof Error?e.message:'UNKNOWN';const code=/^(OIDC_[A-Z0-9_]+|BATCH2_V2_RESPONSE_DENIED_[A-Z0-9_]+|PRIOR_BACKUP_DENIED)$/.test(raw)?raw:'UNEXPECTED_NETWORK_OR_RUNTIME';console.error('FACT001_BATCH2_V2_FAILURE_CODE='+code);process.exitCode=1;}
finally{writeFileSync(output+'/proof.json',JSON.stringify({status:good?'ENCRYPTED_PLAN_VERIFIED':'FAILED_CLOSED',...info,provider_writes:0,queue_activated:false,notion_contents_backed_up:false,checkpoint_committed:false},null,2),{flag:'wx',mode:0o600});}