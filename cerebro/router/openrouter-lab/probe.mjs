import {mkdirSync,writeFileSync} from 'node:fs';
const receipt={probe:'OPENROUTER_QUOTA_LAB_V1',status:'NOT_RUN',attempted:0,private_data:false};
const id='nvidia/nemotron-3-ultra-550b-a55b:free',tag='nvidia';
const zero=x=>(typeof x==='number'||typeof x==='string'&&x.trim()!=='')&&Number.isFinite(Number(x))&&Number(x)===0;
const price=p=>p&&Object.hasOwn(p,'prompt')&&Object.hasOwn(p,'completion')&&Object.values(p).every(zero);
async function main(){
 if(process.env.VERCEL_ENV!=='preview'||!process.env.OPENROUTER_API_KEY){receipt.status='HOLD_ENV';return}
 const headers={Authorization:'Bearer '+process.env.OPENROUTER_API_KEY,'Content-Type':'application/json'};
 const get=async path=>{const r=await fetch('https://openrouter.ai/api/v1/'+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP');return(await r.json()).data};
 const [key,models,detail]=await Promise.all([get('key'),get('models'),get('models/nvidia/nemotron-3-ultra-550b-a55b%3Afree/endpoints')]);
 if(key?.is_free_tier!==true||!zero(key.usage)||!Array.isArray(models)||!Array.isArray(detail?.endpoints)||detail.id!==id){receipt.status='HOLD_ACCOUNT';return}
 const m=models.find(x=>x.id===id&&price(x.pricing));const ep=detail.endpoints.find(x=>x.model_id===id&&x.tag===tag&&price(x.pricing)&&x.supported_parameters?.includes('max_tokens')&&x.max_completion_tokens>=256);
 if(!m||!ep){receipt.status='HOLD_PRICE';return}
 // Fixed public synthetic data only. No private prompts, skills, customers, or runtime endpoint.
 receipt.attempted=1;
 const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(45000),body:JSON.stringify({model:id,messages:[{role:'user',content:'Calculate 23 times 3. Output only the integer.'}],max_tokens:256,stream:false,provider:{only:[tag],allow_fallbacks:false,data_collection:'allow',max_price:{prompt:0,completion:0},require_parameters:true}})});
 receipt.http=r.status;if(!r.ok){receipt.status='HOLD_HTTP_NO_RETRY';return}
 const d=await r.json();receipt.cost=typeof d.usage?.cost==='number'?d.usage.cost:null;
 receipt.correct=d.choices?.[0]?.message?.content?.trim()==='69';receipt.model_verified=d.model===id;receipt.provider_verified=typeof d.provider==='string'&&[tag,ep.provider_name.toLowerCase()].includes(d.provider.toLowerCase());receipt.status=receipt.correct&&receipt.model_verified&&receipt.provider_verified&&zero(receipt.cost)?'PASS_PUBLIC_SYNTHETIC_ZERO_COST':'HOLD_RECEIPT';
}
try{await main()}catch{receipt.status='HOLD_UNKNOWN_NO_RETRY'}
mkdirSync('out',{recursive:true});writeFileSync('out/index.html','<!doctype html><title>Private LAB</title><p>One-shot synthetic validation; no callable inference endpoint.</p>');console.log('CEREBRO_OR_RECEIPT '+JSON.stringify(receipt));if(receipt.status!=='PASS_PUBLIC_SYNTHETIC_ZERO_COST')process.exitCode=1;
