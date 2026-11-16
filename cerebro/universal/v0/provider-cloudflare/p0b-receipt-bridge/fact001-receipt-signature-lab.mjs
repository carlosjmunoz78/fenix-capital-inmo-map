/** FACT-001 LAB: deterministic HMAC-SHA256 proof envelope.
 * NEVER put signing keys in source, D1, browser, logs, or Git.
 * Signature verifies origin from a provisioned LAB signer key, NOT Cloudflare's own signature.
 */
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB'};
const SIGN_FIELDS=Object.freeze([
 'receipt_id','run_id','job_id','request_id','idempotency_key','company_id',
 'engine_id','environment','version','operation','resource_name','policy_version',
 'provider','provider_version_id','readback_status','observed_at_ms','signer_key_id'
]);
const OP=new Set(['worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private']);
const CODE=/^[A-Za-z0-9_.-]{4,128}$/;
const HEX64=/^[a-f0-9]{64}$/;
const RESOURCE=/^cerebro-fact001-managed-lab-[a-z0-9]{4,20}$/;
const hex=a=>Array.from(new Uint8Array(a)).map(b=>b.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/.{2}/g).map(x=>parseInt(x,16)));
function valid(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!SIGN_FIELDS.includes(k)))return false;
 if(Object.entries(SCOPE).some(([k,v])=>r[k]!==v)||!OP.has(r.operation)||
    !RESOURCE.test(r.resource_name||'')||r.provider!=='CLOUDFLARE_WORKERS'||
    r.readback_status!=='READBACK_MATCHED_UNATTESTED'||
    !Number.isSafeInteger(r.observed_at_ms)||r.observed_at_ms<=0)return false;
 for(const k of SIGN_FIELDS.filter(x=>!['observed_at_ms','provider_version_id'].includes(x)))
  if(typeof r[k]!=='string'||!CODE.test(r[k]))return false;
 return r.provider_version_id===null||
  (typeof r.provider_version_id==='string'&&CODE.test(r.provider_version_id));
}
function material(r){return new TextEncoder().encode(JSON.stringify(SIGN_FIELDS.map(k=>r[k])))}
async function key(bytes,operation){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<32||bytes.byteLength>64)throw Error('LAB_SIGNING_KEY_INVALID');
 return crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,[operation]);
}
export async function signFact001LabReceiptV0({receipt,signingKey}={}){
 if(!valid(receipt))throw Error('LAB_RECEIPT_SCOPE_INVALID');
 const raw=material(receipt);
 const digest=hex(await crypto.subtle.digest('SHA-256',raw));
 const signature=hex(await crypto.subtle.sign('HMAC',await key(signingKey,'sign'),raw));
 return Object.freeze({receipt:{...receipt},message_digest:digest,signature_hex:signature,
  signature_scheme:'HMAC-SHA256-LAB-V0',signature_is_provider_native:false});
}
export async function verifyFact001LabReceiptV0({envelope,signingKey}={}){
 if(!envelope||!valid(envelope.receipt)||envelope.signature_scheme!=='HMAC-SHA256-LAB-V0'||
   envelope.signature_is_provider_native!==false||
   !HEX64.test(envelope.message_digest||'')||!HEX64.test(envelope.signature_hex||''))return false;
 const raw=material(envelope.receipt);
 const digest=hex(await crypto.subtle.digest('SHA-256',raw));
 if(digest!==envelope.message_digest)return false;
 try{
  return await crypto.subtle.verify('HMAC',await key(signingKey,'verify'),unhex(envelope.signature_hex),raw);
 }catch{return false}
}
