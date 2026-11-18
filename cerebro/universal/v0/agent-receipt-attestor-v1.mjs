/**
 * Only a server-owned adapter calls this with the provider's secret from Vault.
 * Never expose this verifier, raw secret, or signature material to a browser.
 * A transport-supplied "verified" boolean is not proof; HMAC must pass first.
 */
import {createHmac,timingSafeEqual} from 'node:crypto';
const FIELDS=['source','company_id','environment','engine_id','executor_id','job_id',
 'receipt_id','agent_role_id','subagent_role_id','event','emitted_at','version'];
const PROVIDERS=new Set(['CLOUDFLARE','SUPABASE','GITHUB_ACTIONS','VERCEL','CEREBRO_JOB']);
const EVENTS=new Set(['STARTED','HEARTBEAT','SUCCEEDED','FAILED']);
const valid=s=>typeof s==='string'&&s.length>0&&s.length<=180&&!/[\u0000-\u001f]/.test(s);
export function canonicalAgentReceiptV1(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const result={};
 for(const field of FIELDS){
  const value=input[field];
  if(field==='subagent_role_id'&&value===null){result[field]=null;continue;}
  if(!valid(value))return null;
  result[field]=value;
 }
 if(!PROVIDERS.has(result.source)||!EVENTS.has(result.event)||
  !['LAB','PREPROD','PROD'].includes(result.environment)||
  !Number.isFinite(Date.parse(result.emitted_at)))return null;
 return JSON.stringify(result);
}
export function verifyAgentReceiptHmacV1({receipt,signature_hex,key,expected_source}={}){
 const canonical=canonicalAgentReceiptV1(receipt);
 if(!canonical||!PROVIDERS.has(expected_source)||receipt.source!==expected_source||
  typeof signature_hex!=='string'||!/^[0-9a-f]{64}$/.test(signature_hex)||
  !(key instanceof Uint8Array)||key.length<32)return null;
 const actual=Buffer.from(signature_hex,'hex');
 const expected=createHmac('sha256',key).update('CEREBRO_AGENT_RECEIPT_V1\n'+canonical).digest();
 if(!timingSafeEqual(actual,expected))return null;
 const safe=JSON.parse(canonical);
 return {...safe,server_collector_verified:true,integrity:'VERIFIED_BY_SOURCE_ADAPTER'};
}
