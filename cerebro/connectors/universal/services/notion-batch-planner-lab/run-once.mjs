// Owner-authorized one-time 25→50 encrypted plan, GitHub OIDC -> private LAB service.
// Runner never sees Notion token, encryption key, or decrypted identifiers.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {EXPECTED,SOURCE_SHA,PREVIOUS_SHA} from './batch2-order.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest={id:13808862248,zipSha:'9c2c31831683c89186d76e466ec19de74eaa0eb20d1a2676aea21e56dbe3a702',jsonSha:'582d5bf5eab871c6f86fdb0256bb2bf2785b8f4a284b65f6ba50cb378f2b7957'};
const dir='fact001-notion-batch2-plan-encrypted';mkdirSync(dir,{recursive:true});
const reqPath='cerebro/connectors/universal/services/notion-batch-planner-lab/requests/execute-20261111.v1.json';
const req=JSON.parse(readFileSync(reqPath,'utf8'));
const exact={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'PLAN_SECOND_25_ONLY',offset:25,max_items:25,index_artifact_id:manifest.id,checkpoint_move:false};
if(JSON.stringify(req)!==JSON.stringify(exact))throw Error('OWNER_ORDER_SCOPE_DENIED');
const checkpoint=JSON.parse(readFileSync('cerebro/connectors/universal/services/notion-content-export-lab/checkpoints/first-25-content-readback.v1.json','utf8'));
if(checkpoint.status!=='FIRST_25_CONTENT_ENCRYPTED_OFFSITE_READBACK_VERIFIED'||checkpoint.content_next_offset!==25||checkpoint.content_start_offset!==0||checkpoint.items_sealed!==25||checkpoint.github?.sha256!==PREVIOUS_SHA||checkpoint.drive?.readback_sha256!==PREVIOUS_SHA||checkpoint.verification?.github_vs_drive_sha256_equal!==true||checkpoint.d1_cas_checkpoint_committed!==false)throw Error('CHECKPOINT_PARITY_DENIED');
const apiToken=process.env.GITHUB_TOKEN;if(!apiToken)throw Error('ACTIONS_READ_TOKEN_MISSING');
let downloaded=false,verified=false,metrics={};
async function getIndex(){
 const r=await fetch('https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/actions/artifacts/'+manifest.id+'/zip',{headers:{Authorization:'Bearer '+apiToken,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(r.status!==302)throw Error('INDEX_DOWNLOAD_GATE_'+r.status);
 const l=r.headers.get('location');if(!l)throw Error('INDEX_REDIRECT_ABSENT');const u=new URL(l);
 if(u.protocol!=='https:'||!/\.blob\.core\.windows\.net$|\.actions\.githubusercontent\.com$/.test(u.hostname))throw Error('INDEX_REDIRECT_HOST_DENIED');
 const rr=await fetch(l,{redirect:'error',signal:AbortSignal.timeout(30000)});if(rr.status!==200)throw Error('INDEX_DOWNLOAD_HTTP_'+rr.status);
 const zip=Buffer.from(await rr.arrayBuffer());if(sha(zip)!==manifest.zipSha)throw Error('INDEX_ZIP_SHA_MISMATCH');
 writeFileSync(dir+'/encrypted-source-index.zip',zip,{flag:'wx',mode:0o600});
 const payload=execFileSync('unzip',['-p',dir+'/encrypted-source-index.zip','notion-search-id-index-aes256gcm.json'],{maxBuffer:5_000_000});
 if(sha(payload)!==manifest.jsonSha)throw Error('INDEX_JSON_SHA_MISMATCH');
 const x=JSON.parse(payload.toString('utf8'));
 if(x.status!=='FACT001_NOTION_INDEX_ENCRYPTED'||x.object_count!==6632||x.page_count!==6446||x.data_source_count!==186||x.id_list_sha256!==SOURCE_SHA||x.search_index_complete!==true)throw Error('INDEX_SHAPE_DENIED');
 downloaded=true;return x;
}
async function oidc(){
 const endpoint=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!endpoint||!grant)throw Error('OIDC_UNAVAILABLE');
 const u=endpoint+(endpoint.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');
 const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');const t=(await r.json()).value;
 if(typeof t!=='string'||t.split('.').length!==3)throw Error('OIDC_MALFORMED');return t;
}
async function call(jwt,body){
 const r=await fetch('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-batch-planner-lab/plan',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(90000)});
 let data={};try{data=await r.json()}catch{}return {http:r.status,data};
}
try{
 const index=await getIndex(),jwt=await oidc(),order={...EXPECTED,index_artifact:index};
 const [anon,fake,prod]=await Promise.all([call(null,order),call('invalid-token',order),call(jwt,{...order,environment:'PROD'})]);
 if(anon.http!==401||fake.http!==401||prod.http!==403)throw Error('OIDC_NEGATIVE_GATES_FAILED');
 console.log('FACT001_BATCH2_ANON_401=PASS');console.log('FACT001_BATCH2_FORGED_401=PASS');console.log('FACT001_BATCH2_PROD_403=PASS');
 const result=await call(jwt,order);const b=result.data;
 const expectedRef=sha(SOURCE_SHA+':25:50');
 if(result.http!==200||b?.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||b.verify_roundtrip!==true||b.batch_ref!==expectedRef||b.index_sha256!==SOURCE_SHA||b.offset!==25||b.next_offset!==50||b.items!==25||b.pages+b.data_sources!==25||b.content_downloaded!==false||b.provider_writes!==0||b.queue_activated!==false||b.envelope?.format!=='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1')throw Error('BATCH2_RESPONSE_DENIED_'+result.http);
 writeFileSync(dir+'/second-25-notion-batch-plan-aes256gcm.json',JSON.stringify(b),{flag:'wx',mode:0o600});
 metrics={batch_ref:b.batch_ref,pages:b.pages,data_sources:b.data_sources,offset:b.offset,next_offset:b.next_offset,items:25};
 verified=true;
 console.log('FACT001_BATCH2_PLAN_SEALED=PASS');
 console.log('FACT001_BATCH2_ITEMS=25');console.log('FACT001_BATCH2_PAGES='+b.pages);console.log('FACT001_BATCH2_DATA_SOURCES='+b.data_sources);
}catch(e){
 const raw=e instanceof Error?e.message:'UNEXPECTED';
 const code=/^(CHECKPOINT_PARITY_DENIED|INDEX_[A-Z_0-9]+|OIDC_[A-Z_0-9]+|BATCH2_RESPONSE_DENIED_[0-9]+|ACTIONS_READ_TOKEN_MISSING|OWNER_ORDER_SCOPE_DENIED)$/.test(raw)?raw:'UNEXPECTED_NETWORK_OR_RUNTIME';
 console.log('FACT001_BATCH2_FAILURE_CODE='+code);
 console.log('FACT001_BATCH2_PLAN=BLOCKED');process.exitCode=1;
}
finally{
 const proof={status:verified?'SECOND_25_ENCRYPTED_PLAN_VERIFIED':'BATCH2_PLANNING_BLOCKED',index_artifact_verified:downloaded,encrypted_batch_plan_verified:verified,scope:'fenix-capital/FACT-001/LAB/1.0.0',...metrics,provider_writes:0,queue_activated:false,content_backed_up:false,checkpoint_committed:false};
 writeFileSync(dir+'/proof.json',JSON.stringify(proof,null,2),{flag:'wx',mode:0o600});
 // Remove duplicated 1.6MB index bytes from output before uploading the short encrypted plan.
 const {rmSync}=await import('node:fs');try{rmSync(dir+'/encrypted-source-index.zip')}catch{}
}