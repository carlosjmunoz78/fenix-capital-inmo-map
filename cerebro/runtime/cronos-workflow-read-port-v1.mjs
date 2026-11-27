// CRONOS-001: broker-only official Cloudflare read port. Never installs a credential in Windows.
import {isDeepStrictEqual as equal} from 'node:util';
export const SOURCE=Object.freeze({workflow:'cerebro-cronos-live005-lab-eu',instance_id:'cronos-live005-20261126',workflow_version:'0a0e4a6b-881f-4fd5-a230-7a67ca072050'});
const URL_FIXED='https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/workflows/'+SOURCE.workflow+'/instances/'+SOURCE.instance_id;
const check=(ok,code)=>{if(!ok)throw new Error(code)};
export function createCronosCloudflareReadPortV1({getReadCredential,fetchImpl=globalThis.fetch}={}){
 check(typeof getReadCredential==='function'&&typeof fetchImpl==='function','BROKER_CREDENTIAL_PORT_REQUIRED');
 return async function readback(source,{signal}={}){
  check(equal(source,SOURCE),'CRONOS_SOURCE_DENIED');
  check(!signal?.aborted,'CRONOS_ABORTED');
  // Only trusted broker supplies credential; never accept it in a job payload.
  const token=await getReadCredential();
  check(typeof token==='string'&&token.length>=20&&token.length<=512&&!/[\r\n\s]/.test(token),'BROKER_CREDENTIAL_UNAVAILABLE');
  check(!signal?.aborted,'CRONOS_ABORTED');
  let response;try{response=await fetchImpl(URL_FIXED,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'manual',cache:'no-store',signal});}catch{throw new Error('CLOUDFLARE_READ_FAILED')}
  return normalizeCronosCloudflareResponseV1(response);
 };
}

export async function normalizeCronosCloudflareResponseV1(response){
 check(response?.status===200&&!response.redirected,'CLOUDFLARE_READ_DENIED');
 check(/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''),'CLOUDFLARE_CONTENT_TYPE');
 const declared=response.headers.get('content-length');
 check(declared===null||(/^\d+$/.test(declared)&&Number(declared)<=65536),'CLOUDFLARE_RESPONSE_LIMIT');
 const reader=response.body?.getReader();check(reader,'CLOUDFLARE_BODY_MISSING');
 let total=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;check(total<=65536,'CLOUDFLARE_RESPONSE_LIMIT');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 let envelope;try{envelope=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('CLOUDFLARE_JSON_INVALID')}
 const x=envelope?.result;
 check(envelope?.success===true&&x?.versionId===SOURCE.workflow_version&&x?.status==='complete'&&x.success===true&&x.error===null,'CLOUDFLARE_TERMINAL_DENIED');
 check(x.step_count===3&&Array.isArray(x.steps)&&x.steps.length===3,'CLOUDFLARE_STEP_COUNT');
 const steps=x.steps.map(s=>{check(typeof s.output==='string'&&s.output.length<=16384&&Array.isArray(s.attempts),'CLOUDFLARE_STEP_INVALID');let output;try{output=JSON.parse(s.output)}catch{throw new Error('CLOUDFLARE_STEP_JSON')};return {name:s.name,success:s.success,retries:s.config?.retries?.limit,attempt_count:s.attempts.length,output};});
 return {source:SOURCE,observed_at:new Date().toISOString(),provider:{status:x.status,success:x.success,error:x.error,start:x.start,end:x.end,output:x.output,steps}};
}
export const CRONOS_CLOUDFLARE_READ_PORT_V1=Object.freeze({capability:'CRONOS.EVIDENCE.READ',environment:'LAB',method:'GET',source:SOURCE,broker_only:true,credential_in_job:false,public_route:false,creates_workflow:false,paid_ai:false,prod_authorized:false});