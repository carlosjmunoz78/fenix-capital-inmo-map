// FACT-001 · Explicit single-run signed exporter, encrypted-only output.
// GitHub-hosted runner contains no Notion or AES key. Does not move checkpoints.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const known={zip_id:13808673839,zip_sha:'f041759233b1ad746466c3d3a1e275f5c49f286c2425429c7ae6fc840ed0d0b4',json_sha:'daa4030cc8d9023d1c4369ca6c5afa2928b0f35e4f40f1466bb252b6f53d320a',batch_ref:'50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7',index_sha:'205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca'};
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order',operation:'notion.lab.content_export.page',request_id:'FACT001-NOTION-FIRST-25-CONTENT-20261110',batch_ref:known.batch_ref};
const first='cerebro/connectors/universal/services/notion-content-export-lab/requests/execute-20261110.v1.json';
const requested=JSON.parse(readFileSync(first,'utf8'));
const exact={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'EXPORT_FIRST_25_ONLY',plan_artifact_id:known.zip_id,checkpoint_move:false};
if(JSON.stringify(requested)!==JSON.stringify(exact))throw Error('OWNER_ORDER_SCOPE_INVALID');
const token=process.env.GITHUB_TOKEN;
if(typeof token!=='string'||!token)throw Error('GITHUB_READ_TOKEN_MISSING');
const resultDir='fact001-first-25-encrypted-content';mkdirSync(resultDir,{recursive:true});
let downloaded=false,success=0,failed=0;let proof=[];
async function downloadArtifact(){
 const url='https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/actions/artifacts/'+known.zip_id+'/zip';
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(r.status!==302)throw Error('ARTIFACT_REDIRECT_UNVERIFIED_'+r.status);
 const target=r.headers.get('location');if(!target||!target.startsWith('https://'))throw Error('ARTIFACT_REDIRECT_UNTRUSTED');
 const u=new URL(target);if(!(/\.blob\.core\.windows\.net$/.test(u.hostname)||/\.actions\.githubusercontent\.com$/.test(u.hostname)||u.hostname==='productionresultssa0.blob.core.windows.net'))throw Error('ARTIFACT_HOST_UNTRUSTED');
 const data=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(20000)});if(data.status!==200)throw Error('ARTIFACT_BYTES_UNVERIFIED');
 const zip=Buffer.from(await data.arrayBuffer());if(sha(zip)!==known.zip_sha)throw Error('ARTIFACT_SHA_MISMATCH');
 writeFileSync('fact001-index-batch.zip',zip,{flag:'wx',mode:0o600});
 const json=execFileSync('unzip',['-p','fact001-index-batch.zip','first-25-notion-work-items-aes256gcm.json'],{maxBuffer:200000});
 if(sha(json)!==known.json_sha)throw Error('PLAN_JSON_SHA_MISMATCH');
 const artifact=JSON.parse(json.toString('utf8'));
 if(artifact.batch_ref!==known.batch_ref||artifact.index_sha256!==known.index_sha||artifact.items!==25||artifact.pages!==25||artifact.offset!==0||artifact.next_offset!==25||artifact.envelope?.format!=='FACT001-NOTION-CONTENT-BATCH-PLAN-AES256GCM-V1')throw Error('PLAN_NOT_FIXED');
 downloaded=true;return artifact;
}
async function oidc(){
 const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!ep||!grant)throw Error('OIDC_UNAVAILABLE');
 const url=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent('cerebro-fact001-provider-headless-lab-v1');
 const r=await fetch(url,{headers:{Authorization:'Bearer '+grant},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(r.status!==200)throw Error('OIDC_ISSUER_DENIED');const jwt=(await r.json()).value;
 if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_BAD');return jwt;
}
async function run(){
 const plan=await downloadArtifact();const jwt=await oidc();
 const endpoint='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-notion-content-export-lab/export';
 for(let i=0;i<25;i++){
  let response,body;
  try{
   response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+jwt,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({...scope,item_index:i,plan_artifact:plan}),redirect:'error',signal:AbortSignal.timeout(90000)});
   body=await response.json();
   if(response.status!==200||body?.status!=='FACT001_NOTION_PAGE_CONTENT_SEALED'||body.verify_roundtrip!==true||body.batch_ref!==known.batch_ref||body.item_index!==i||body.checkpoint_committed!==false||body.provider_writes!==0||!body.envelope?.ciphertext_b64)throw Error('PAGE_BLOCKED_'+response.status+'_'+String(body?.code||'UNKNOWN').replace(/[^A-Z_]/g,''));
   const raw=Buffer.from(JSON.stringify(body));writeFileSync(resultDir+'/page-'+String(i).padStart(2,'0')+'.aes256gcm.json',raw,{flag:'wx',mode:0o600});
   proof.push({index:i,status:'SEALED_AND_MEMORY_REBUILT',sha256:sha(raw),bytes:raw.length,blocks:body.block_count});success++;
   console.log('FACT001_CONTENT_INDEX_'+i+'=SEALED');
  }catch(e){failed++;proof.push({index:i,status:'BLOCKED'});console.error('FACT001_CONTENT_INDEX_'+i+'=BLOCKED');break;}
 }
}
try{await run();}catch{failed++;console.error('FACT001_CONTENT_RUNTIME=BLOCKED');}
finally{
 const record={status:failed?'PARTIAL_CONTENT_EXPORT':'FIRST_25_CONTENT_EXPORT_ENCRYPTED_ONLY',batch_ref:known.batch_ref,index_sha256:known.index_sha,plan_artifact_confirmed:downloaded,success_count:success,failed_count:failed,expected_count:25,contents_verified_locally:false,encrypted_archive_readback_done:false,provider_writes:0,checkpoint_committed:false,items:proof};
 writeFileSync(resultDir+'/proof.json',JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
 console.log('FACT001_CONTENT_CIPHERTEXT_FILES='+success);console.log('FACT001_CONTENT_FILES_PENDING='+String(25-success));console.log('FACT001_CONTENT_CHECKPOINT_MOVED=false');console.log('FACT001_CONTENT_PROVIDER_WRITES=0');
}
if(failed||success!==25)process.exitCode=1;