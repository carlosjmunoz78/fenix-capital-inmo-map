// FACT-001 signed one-shot export of 24 pages and 1 data source. No plaintext or provider credentials in GH runner.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const known={artifact_id:13812694087,zip_sha:'bdc1fc75b32608d48d92f6bf44e9648c392b8a386c8ffdc1f1858e26cb918a22',json_sha:'1a83d12baa5f9d8dc340706e3ba555f7d4df3eff29b4f303cf30632fd3877c71',batch_ref:'f84ce878daf73f1a8567779b50d720937bd0876474861f71d40041af7ddfe787',index_sha:'205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca',old_zip:'e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65'};
const path='cerebro/connectors/universal/services/notion-content-export-v2-lab/requests/execute-20261111.v1.json';
const expected={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'EXPORT_SECOND_MIXED_25_ONCE',plan_artifact_id:known.artifact_id,checkpoint_move:false};
if(JSON.stringify(JSON.parse(readFileSync(path,'utf8')))!==JSON.stringify(expected))throw Error('OWNER_ORDER_DENIED');
const cp=JSON.parse(readFileSync('cerebro/connectors/universal/services/notion-content-export-lab/checkpoints/first-25-content-readback.v1.json','utf8'));
if(cp.status!=='FIRST_25_CONTENT_ENCRYPTED_OFFSITE_READBACK_VERIFIED'||cp.content_next_offset!==25||cp.items_sealed!==25||cp.github?.sha256!==known.old_zip||cp.drive?.readback_sha256!==known.old_zip||cp.d1_cas_checkpoint_committed!==false)throw Error('PREVIOUS_OFFSITE_GATE_DENIED');
const resultDir='fact001-notion-second-25-encrypted-content';mkdirSync(resultDir,{recursive:true});
const access=process.env.GITHUB_TOKEN;if(typeof access!=='string'||!access)throw Error('ACTIONS_READ_TOKEN_MISSING');
let planVerified=false,success=0,failed=0,proof=[];
async function download(){
 const r=await fetch('https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/actions/artifacts/'+known.artifact_id+'/zip',{headers:{Authorization:'Bearer '+access,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'manual',signal:AbortSignal.timeout(18000)});
 if(r.status!==302)throw Error('PLAN_ARTIFACT_HTTP_'+r.status);const loc=r.headers.get('location');if(!loc)throw Error('PLAN_ARTIFACT_REDIRECT_MISSING');
 const u=new URL(loc);if(u.protocol!=='https:'||!(/\.blob\.core\.windows\.net$/.test(u.hostname)||/\.actions\.githubusercontent\.com$/.test(u.hostname)))throw Error('PLAN_ARTIFACT_HOST_DENIED');
 const resp=await fetch(loc,{redirect:'error',signal:AbortSignal.timeout(25000)});if(resp.status!==200)throw Error('PLAN_ARTIFACT_DOWNLOAD_DENIED');
 const zip=Buffer.from(await resp.arrayBuffer());if(sha(zip)!==known.zip_sha)throw Error('PLAN_ARTIFACT_ZIP_SHA_MISMATCH');
 writeFileSync('fact001-second-plan-input.zip',zip,{flag:'wx',mode:0o600});
 const raw=execFileSync('unzip',['-p','fact001-second-plan-input.zip','second-25-notion-batch-plan.aes256gcm.json'],{maxBuffer:100000});
 if(sha(raw)!==known.json_sha)throw Error('PLAN_ARTIFACT_JSON_SHA_MISMATCH');
 const x=JSON.parse(raw.toString('utf8'));
 if(x.status!=='FACT001_NOTION_CONTENT_BATCH_SEALED'||x.index_sha256!==known.index_sha||x.batch_ref!==known.batch_ref||x.offset!==25||x.next_offset!==50||x.items!==25||x.pages!==24||x.data_sources!==1||!x.verify_roundtrip||x.envelope?.format!=='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1')throw Error('PLAN_ARTIFACT_SCOPE_DENIED');
 planVerified=true;return x;
}
async function jwt(){const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;if(!ep||!grant)throw Error('OIDC_MISSING');const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},redirect:'error',signal:AbortSignal.timeout(12000)});if(r.status!==200)throw Error('OIDC_DENIED_'+r.status);const token=(await r.json()).value;if(typeof token!=='string'||token.split('.').length!==3)throw Error('OIDC_MALFORMED');return token;}
const fixed={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.content_export.mixed_object',request_id:'FACT001-NOTION-SECOND-25-CONTENT-20261111',batch_ref:known.batch_ref};
async function call(token,body){const r=await fetch('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-content-export-v2-lab/export',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(180000)});let data={};try{data=await r.json()}catch{}return {http:r.status,data};}
try{
 const plan=await download(),token=await jwt(),base={...fixed,item_index:0,plan_artifact:plan};
 const [anon,fake,prod]=await Promise.all([call(null,base),call('invalid',base),call(token,{...base,environment:'PROD'})]);
 if(anon.http!==401||fake.http!==401||prod.http!==403)throw Error('OIDC_NEGATIVE_GATES_DENIED');
 console.log('FACT001_MIXED25_ANON_401=PASS');console.log('FACT001_MIXED25_FORGED_401=PASS');console.log('FACT001_MIXED25_PROD_403=PASS');
 for(let i=0;i<25;i++){
  const v=await call(token,{...fixed,item_index:i,plan_artifact:plan});const d=v.data;
  if(v.http!==200||d?.status!=='FACT001_NOTION_MIXED_OBJECT_CONTENT_SEALED'||d.verify_roundtrip!==true||d.batch_ref!==known.batch_ref||d.index_sha256!==known.index_sha||d.item_index!==i||d.global_offset!==25+i||!['page','data_source'].includes(d.kind)||d.provider_writes!==0||d.checkpoint_committed!==false||d.media_binaries_backed_up!==false||d.comments_backed_up!==false||!d.envelope?.ciphertext_b64)throw Error('MIXED_ITEM_BLOCKED_'+i+'_HTTP_'+v.http+'_'+String(d.code||'NONE').replace(/[^A-Z0-9_]/g,''));
  const serialized=Buffer.from(JSON.stringify(d));writeFileSync(resultDir+'/item-'+String(i).padStart(2,'0')+'.aes256gcm.json',serialized,{flag:'wx',mode:0o600});
  proof.push({index:i,status:'SEALED_AND_MEMORY_REBUILT',kind:d.kind,rows:d.row_count,blocks:d.block_count,sha256:sha(serialized),bytes:serialized.length});success++;
  console.log('FACT001_MIXED25_ITEM_'+i+'=SEALED_'+d.kind.toUpperCase());
 }
}catch(e){failed++;const raw=e instanceof Error?e.message:'UNKNOWN';const code=/^(MIXED_ITEM_BLOCKED_[0-9]+_HTTP_[0-9]+_[A-Z0-9_]+|PLAN_ARTIFACT_[A-Z0-9_]+|OIDC_[A-Z0-9_]+|PREVIOUS_OFFSITE_GATE_DENIED|OWNER_ORDER_DENIED)$/.test(raw)?raw:'UNEXPECTED_NETWORK_OR_RUNTIME';console.log('FACT001_MIXED25_FAILURE_CODE='+code);}
finally{
 writeFileSync(resultDir+'/proof.json',JSON.stringify({status:success===25&&failed===0?'SECOND_25_MIXED_CONTENT_ENCRYPTED':'PARTIAL_MIXED_CONTENT_BACKUP',expected:25,encrypted_objects:success,failed_items:failed,plan_verified:planVerified,batch_ref:known.batch_ref,index_sha256:known.index_sha,provider_writes:0,checkpoint_committed:false,media_binaries_backed_up:false,comments_backed_up:false,items:proof},null,2),{flag:'wx',mode:0o600});
 console.log('FACT001_MIXED25_TOTAL_SEALED='+success);console.log('FACT001_MIXED25_PROVIDER_WRITES=0');console.log('FACT001_MIXED25_CHECKPOINT_MOVED=false');
}
if(failed||success!==25)process.exitCode=1;