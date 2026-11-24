import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePacket,score} from './skill-oracle.mjs';
const receipt={probe:'OPENROUTER_SKILL_EVAL_LAB_V1',request_id:APPROVED_PACKET_ID,status:'NOT_RUN',attempted:0,private_skill_owner_authorized:true,customer_data:false};
const modelId='nvidia/nemotron-3-ultra-550b-a55b:free',tag='nvidia';
const zero=x=>(typeof x==='number'||typeof x==='string'&&x.trim()!=='')&&Number.isFinite(Number(x))&&Number(x)===0;
const price=p=>p&&Object.hasOwn(p,'prompt')&&Object.hasOwn(p,'completion')&&Object.values(p).every(zero);
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
async function main(){
 if(process.env.VERCEL_ENV!=='preview'||!process.env.OPENROUTER_API_KEY){receipt.status='HOLD_ENV';return}
 let p;try{p=JSON.parse(process.env[APPROVED_PACKET_ENV]??'')}catch{receipt.status='HOLD_PACKET';return}
 if(!validatePacket(p,APPROVED_PACKET_ID)){receipt.status='HOLD_PACKET';return}
 receipt.skill=p.skill_name;receipt.case_id=p.case_id;receipt.skill_sha256=hash(p.skill_text);receipt.case_sha256=hash(p.question);receipt.oracle_sha256=hash(JSON.stringify(p.oracle));
 const headers={Authorization:'Bearer '+process.env.OPENROUTER_API_KEY,'Content-Type':'application/json'};
 const get=async path=>{const r=await fetch('https://openrouter.ai/api/v1/'+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP');return(await r.json()).data};
 const [key,models,detail]=await Promise.all([get('key'),get('models'),get('models/nvidia/nemotron-3-ultra-550b-a55b%3Afree/endpoints')]);
 if(key?.is_free_tier!==true||!zero(key.usage)||!Array.isArray(models)||!Array.isArray(detail?.endpoints)||detail.id!==modelId){receipt.status='HOLD_ACCOUNT';return}
 const m=models.find(x=>x.id===modelId&&price(x.pricing));const ep=detail.endpoints.find(x=>x.model_id===modelId&&x.tag===tag&&price(x.pricing)&&x.supported_parameters?.includes('max_tokens')&&x.max_completion_tokens>=1536);
 if(!m||!ep){receipt.status='HOLD_PRICE';return}
 receipt.attempted=1;
 const body={model:modelId,messages:[{role:'system',content:'You are taking a bounded behavioral evaluation. Apply the following skill to the synthetic exercise; no tools are available.\n\n'+p.skill_text},{role:'user',content:p.question}],max_tokens:1536,stream:false,provider:{only:[tag],allow_fallbacks:false,data_collection:'allow',max_price:{prompt:0,completion:0},require_parameters:true}};
 const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(45000)});
 receipt.http=res.status;if(!res.ok){receipt.status='HOLD_HTTP_NO_RETRY';return}
 const d=await res.json();receipt.cost=typeof d.usage?.cost==='number'?d.usage.cost:null;receipt.model_verified=d.model===modelId;receipt.provider_verified=typeof d.provider==='string'&&[tag,ep.provider_name.toLowerCase()].includes(d.provider.toLowerCase());
 receipt.prompt_tokens=Number.isSafeInteger(d.usage?.prompt_tokens)?d.usage.prompt_tokens:null;
 receipt.completion_tokens=Number.isSafeInteger(d.usage?.completion_tokens)?d.usage.completion_tokens:null;
 if(!receipt.model_verified||!receipt.provider_verified||!zero(receipt.cost)){receipt.status='HOLD_PROVIDER_RECEIPT';return}
 receipt.evaluation=score(d.choices?.[0]?.message?.content,p.oracle);
 receipt.status=receipt.evaluation.all_pass?'PASS_BEHAVIORAL_SMOKE_ZERO_COST':'BEHAVIORAL_FAILURE_ZERO_COST';
}
try{await main()}catch{receipt.status='HOLD_UNKNOWN_NO_RETRY'}
mkdirSync('out',{recursive:true});writeFileSync('out/index.html','<!doctype html><title>LAB behavioral evaluation</title><p>Single controlled build, no inference endpoint.</p>');
console.log('CEREBRO_SKILL_RECEIPT '+JSON.stringify(receipt));
if(receipt.status!=='PASS_BEHAVIORAL_SMOKE_ZERO_COST')process.exitCode=1;
