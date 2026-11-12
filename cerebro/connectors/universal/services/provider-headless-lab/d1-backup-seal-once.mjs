// FACT-001: one-shot signed GH OIDC. SQL and AES key NEVER leave Vault-backed Edge.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const requestPath='cerebro/connectors/universal/services/provider-headless-lab/requests/d1-backup-execute-once-20261112.v1.json';
const approved={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',action:'D1_BACKUP_ENCRYPTED_ONCE',database_id:'1305f791-7c44-47f9-946b-f330a09c88aa',ciphertext_only:true};
const request=JSON.parse(readFileSync(requestPath,'utf8'));
if(JSON.stringify(request)!==JSON.stringify(approved))throw Error('ORDER_FILE_DENIED');
if(process.env.GITHUB_REPOSITORY!=='carlosjmunoz78/fenix-capital-inmo-map'||
   process.env.GITHUB_REF!=='refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109'||
   process.env.GITHUB_ACTOR!=='carlosjmunoz78'||process.env.GITHUB_EVENT_NAME!=='push')throw Error('WORKFLOW_CONTEXT_DENIED');
const oidcUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,oidcToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!oidcUrl||!oidcToken)throw Error('OIDC_ENV_DENIED');
const url=oidcUrl+(oidcUrl.includes('?')?'&':'?')+'audience=cerebro-fact001-d1-backup-seal-lab-v1';
const auth=await fetch(url,{headers:{Authorization:'Bearer '+oidcToken},redirect:'error',signal:AbortSignal.timeout(12000)});
if(auth.status!==200)throw Error('OIDC_HTTP_'+auth.status);
const jwt=(await auth.json())?.value;
if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_VALUE_DENIED');
const rootUrl='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-d1-backup-seal-lab/';
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order'};
async function call(route,body){
 const res=await fetch(rootUrl+route,{method:'POST',headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json',Accept:'application/json'},
 body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(90000)});
 let data={};try{data=await res.json();}catch{}
 if(res.status!==200)throw Error('SEALED_EDGE_HTTP_'+res.status+'_'+String(data?.code||data?.status||'UNKNOWN').replace(/[^A-Z0-9_]/g,''));
 return data;
}
const sealed=await call('seal-once',{...scope,operation:'cloudflare.d1.recovery_backup.seal_once_lab',request_id:'FACT001-D1-BACKUP-ONCE-20261112-001'});
const envelope=sealed?.envelope;
if(sealed?.status!=='D1_BACKUP_CIPHERTEXT_SEALED_LAB'||sealed.provider_writes!==0||sealed.plaintext_returned!==false||
 envelope?.format!=='FACT001-D1-FULL-DATA-AES256GCM-V1'||envelope?.scope?.database_id!==approved.database_id||
 envelope?.key_material_included!==false||typeof envelope?.ciphertext_b64!=='string'||envelope.ciphertext_b64.length>11_000_000)
 throw Error('ENVELOPE_CONTRACT_DENIED');
const verified=await call('verify-once',{order:{...scope,operation:'cloudflare.d1.recovery_backup.verify_once_lab',
 request_id:'FACT001-D1-BACKUP-VERIFY-20261112-001'},envelope});
if(verified.status!=='D1_BACKUP_DECRYPT_ROUNDTRIP_LAB'||verified.plaintext_bytes!==envelope.plaintext_bytes||
 verified.plaintext_sha256!==envelope.plaintext_sha256||verified.plaintext_returned!==false||verified.provider_writes!==0)
 throw Error('BACKEND_DECRYPT_ROUNDTRIP_DENIED');
const folder='fact001-d1-encrypted-offsite';mkdirSync(folder,{recursive:true});
const contents=Buffer.from(JSON.stringify(envelope)+'\n');
const sha256=createHash('sha256').update(contents).digest('hex');
writeFileSync(folder+'/d1-backup.aes256gcm.json',contents,{flag:'wx',mode:0o600});
writeFileSync(folder+'/proof.json',JSON.stringify({status:'SIGNED_BACKEND_SEALED_AND_DECRYPT_VERIFIED',
 ciphertext_file_sha256:sha256,ciphertext_file_bytes:contents.length,
 plaintext_sha256:envelope.plaintext_sha256,plaintext_bytes:envelope.plaintext_bytes,
 external_writes:0,secret_exposed:false,sql_exposed:false,offsite_drive_verified:false,
 physical_sqlite_restore:false,independent_key_escrow:false,backup_and_rollback:'PENDING'},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('FACT001_D1_SEALED=true');
console.log('FACT001_D1_VAULT_ROUNDTRIP=true');
console.log('FACT001_D1_FILE_SHA256='+sha256);
console.log('FACT001_D1_FILE_BYTES='+contents.length);
console.log('FACT001_D1_PLAINTEXT_BYTES='+envelope.plaintext_bytes);
console.log('FACT001_D1_SQL_AND_KEY_EXPOSED=false');
