// FACT-001 D1 Recovery LAB: reusable cryptographic envelope. PURE; no I/O, no writes.
// Intended to be called only inside a signed backend with an encryption key loaded from Vault.
// NEVER send key material or decrypted bytes to ChatGPT, GitHub logs, or browser clients.
const SCOPE = Object.freeze({
  company_id: 'fenix-capital', engine_id: 'FACT-001', environment: 'LAB', version: '1.0.0',
  provider: 'cloudflare', database_id: '1305f791-7c44-47f9-946b-f330a09c88aa',
});
const FORMAT = 'FACT001-D1-FULL-DATA-AES256GCM-V1';
const CAP = 8_000_000;
const encoder = new TextEncoder();
const hex = (buffer) => Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2,'0')).join('');
const bytesToB64 = (arr) => {
  let s='';for(let i=0;i<arr.length;i+=8192)s+=String.fromCharCode(...arr.subarray(i,i+8192));
  return btoa(s);
};
const b64ToBytes=(value,cap)=>{
  if(typeof value!=='string'||value.length===0||value.length>Math.ceil(cap*4/3)+8||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('ENVELOPE_INVALID_ENCODING');
  const s=atob(value);const bytes=Uint8Array.from(s,c=>c.charCodeAt(0));
  if(bytes.length>cap)throw Error('ENVELOPE_SIZE_DENIED');return bytes;
};
function exactScope(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||
    JSON.stringify(Object.keys(v).sort())!==JSON.stringify(Object.keys(SCOPE).sort())||
    Object.entries(SCOPE).some(([k,x])=>v[k]!==x))throw Error('ENVELOPE_SCOPE_DENIED');
  return SCOPE;
}
function keyCheck(v){if(!(v instanceof Uint8Array)||v.byteLength!==32)throw Error('ENVELOPE_KEY_INVALID');return v;}
function copyPlain(v){
  if(!(v instanceof Uint8Array)||v.byteLength<1||v.byteLength>CAP)throw Error('ENVELOPE_PAYLOAD_INVALID');
  return v;
}
const aad = () => encoder.encode(JSON.stringify({format:FORMAT,scope:SCOPE}));
async function importKey(value){return crypto.subtle.importKey('raw',keyCheck(value),{name:'AES-GCM'},false,['encrypt','decrypt']);}
const sha256=async v=>hex(await crypto.subtle.digest('SHA-256',v));

export const D1_BACKUP_SCOPE = SCOPE;
export const D1_BACKUP_FORMAT = FORMAT;
export const D1_BACKUP_MAX_BYTES = CAP;

export async function sealD1Backup({scope,plaintext,keyBytes}){
  exactScope(scope);copyPlain(plaintext);
  const key=await importKey(keyBytes);
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad(),tagLength:128},key,plaintext));
  return Object.freeze({
    format:FORMAT,scope:SCOPE,algorithm:'AES-256-GCM',
    iv_b64:bytesToB64(nonce),ciphertext_b64:bytesToB64(ciphertext),
    plaintext_sha256:await sha256(plaintext),plaintext_bytes:plaintext.length,
    ciphertext_sha256:await sha256(ciphertext),
    key_material_included:false,
  });
}

export async function openD1Backup({scope,envelope,keyBytes}){
  exactScope(scope);
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
     JSON.stringify(Object.keys(envelope).sort())!==JSON.stringify([
       'format','scope','algorithm','iv_b64','ciphertext_b64','plaintext_sha256',
       'plaintext_bytes','ciphertext_sha256','key_material_included'].sort())||
     envelope.format!==FORMAT||envelope.algorithm!=='AES-256-GCM'||envelope.key_material_included!==false)
     throw Error('ENVELOPE_METADATA_DENIED');
  exactScope(envelope.scope);
  if(!Number.isSafeInteger(envelope.plaintext_bytes)||envelope.plaintext_bytes<1||envelope.plaintext_bytes>CAP||
     !/^[a-f0-9]{64}$/.test(envelope.plaintext_sha256||'')||
     !/^[a-f0-9]{64}$/.test(envelope.ciphertext_sha256||''))throw Error('ENVELOPE_METADATA_DENIED');
  const nonce=b64ToBytes(envelope.iv_b64,12);
  if(nonce.length!==12)throw Error('ENVELOPE_IV_DENIED');
  const ciphertext=b64ToBytes(envelope.ciphertext_b64,CAP+16);
  if(ciphertext.length!==envelope.plaintext_bytes+16||await sha256(ciphertext)!==envelope.ciphertext_sha256)
    throw Error('ENVELOPE_CIPHERTEXT_HASH_DENIED');
  let plaintext;
  try {plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:aad(),tagLength:128},await importKey(keyBytes),ciphertext));}
  catch {throw Error('ENVELOPE_AUTHENTICATION_FAILED');}
  if(plaintext.length!==envelope.plaintext_bytes||await sha256(plaintext)!==envelope.plaintext_sha256)
    throw Error('ENVELOPE_PLAINTEXT_HASH_DENIED');
  // Callers must not log or return plaintext. Rebuild SQLite only in isolated backend.
  return plaintext;
}
