/** Single shared LAB executor. Hardcoded target, no redirects, no arbitrary commands. */
const URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-command-executor-lab-v0';
const HEX=/^[a-f0-9]{64}$/;
const IDEM=/^lab-fact-attest-[a-z0-9-]{12,48}$/;
const empty=reason=>({status:'UNAVAILABLE',reason,source:'FACT_REGISTRY_ATTEST_LAB',
 executed:false,external_actions_executed:false,prod_execution_enabled:false});
function good(data){
 return data&&typeof data==='object'&&!Array.isArray(data)&&
  data.status==='FACT_ATTESTATION_EXECUTED'&&data.source==='PREPROD_LAB_DETERMINISTIC_RECEIPT'&&
  data.company_id==='fenix'&&data.environment==='LAB'&&data.engine_id==='FACT-001'&&
  data.capability_id==='fact.registry.attest'&&data.version==='0.1.0-lab'&&
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(data.receipt_id||'')&&
  data.registry_count===179&&data.base_count===177&&HEX.test(data.registry_digest||'')&&
  data.executed===true&&data.external_actions_executed===false&&
  data.prod_execution_enabled===false&&data.additional_cost_eur===0&&
  typeof data.replayed==='boolean'&&data.operational_engines_verified===false;
}
export function createFactAttestationAdapterLabV0({preprodApiKey,ownerApiKey,fetchImpl=globalThis.fetch}={}){
 if(typeof preprodApiKey!=='string'||!preprodApiKey.startsWith('sb_publishable_')||preprodApiKey.length>256)
  throw Error('PREPROD_PUBLISHABLE_KEY_REQUIRED');
 if(typeof ownerApiKey!=='string'||ownerApiKey.length<12||ownerApiKey.length>256)throw Error('OWNER_APIKEY_REQUIRED');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 const assertContext=ctx=>{if(ctx?.company_id!=='fenix'||ctx?.environment!=='LAB'||
  typeof ctx?.session_token!=='string'||ctx.session_token.length<20||ctx.session_token.length>8192||
  /\s/.test(ctx.session_token))throw Error('OWNER_CONTEXT_INVALID')};
 async function call(method,ctx){
  assertContext(ctx);
  if(method==='POST'&&(!IDEM.test(ctx.idempotency_key||'')||!HEX.test(ctx.registry_digest||'')||
   ctx.registry_count!==179||ctx.base_count!==177||ctx.preserved_base!==true))
    throw Error('FACT_ATTEST_CONTRACT_INVALID');
  let response;
  try{
   response=await fetchImpl(URL,{method,redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(9000),
    headers:{authorization:'Bearer '+ctx.session_token,apikey:preprodApiKey,
     'x-cerebro-owner-prod-apikey':ownerApiKey,accept:'application/json',
     ...(method==='POST'?{'content-type':'application/json'}:{})},
    ...(method==='POST'?{body:JSON.stringify({
      action:'FACT001_REGISTRY_ATTEST',company_id:'fenix',environment:'LAB',
      engine_id:'FACT-001',capability_id:'fact.registry.attest',version:'0.1.0-lab',
      idempotency_key:ctx.idempotency_key,registry_count:179,base_count:177,
      preserved_base:true,registry_digest:ctx.registry_digest
    })}:{})
   });
  }catch{return empty('FACT_EXECUTOR_UNREACHABLE')}
  if(response?.status!==200)return empty(response?.status===401||response?.status===403?'OWNER_DENIED':'FACT_EXECUTOR_UNAVAILABLE');
  let data;try{data=await response.json()}catch{return empty('FACT_EXECUTOR_RESPONSE_INVALID')}
  if(method==='POST'){
   if(!good(data)||data.registry_digest!==ctx.registry_digest)return empty('FACT_EXECUTOR_PROOF_INVALID');
   return data;
  }
  if(!data||data.status!=='OK'||data.source!=='PREPROD_LAB_DETERMINISTIC_RECEIPT'||
   data.prod_execution_enabled!==false||data.executed_external_actions!==false||
   data.latest!==null&&!good(data.latest))return empty('FACT_LATEST_PROOF_INVALID');
  return data;
 }
 return Object.freeze({executeForContext:ctx=>call('POST',ctx),latestForContext:ctx=>call('GET',ctx)});
}
