/**
 * CUT40 - exact live PROD Gateway parity, READ ONLY; never mutate.
 * Only the existing OWNER JWT from GitHub encrypted secrets may authorize.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const BASE='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0';
const endpoints=['health','contract','engines'];
function assert(condition,reason){if(!condition)throw Error(reason)}
export async function inspectOwnerGateway({jwt,publishableKey,fetchImpl=fetch}){
 assert(typeof jwt==='string'&&jwt.length>32,'OWNER_JWT_NOT_AVAILABLE');
 assert(typeof publishableKey==='string'&&publishableKey.startsWith('sb_publishable_'),'PUBLISHABLE_KEY_NOT_AVAILABLE');
 const call=async(path,authenticated)=>{
  assert(endpoints.includes(path),'ENDPOINT_NOT_ALLOWLISTED');
  const url=BASE+'/'+path;
  const headers={apikey:publishableKey,accept:'application/json'};
  if(authenticated)headers.authorization='Bearer '+jwt;
  const response=await fetchImpl(url,{method:'GET',cache:'no-store',
   headers,signal:AbortSignal.timeout(12000)});
  return response;
 };
 const unauthorized=await call('health',false);
 assert(unauthorized.status===401||unauthorized.status===403,'GATEWAY_ANON_NOT_DENIED');
 const results={};
 for(const path of endpoints){
  const response=await call(path,true);
  assert(response.status===200,'GATEWAY_OWNER_'+path.toUpperCase()+'_HTTP_'+response.status);
  const data=await response.json();
  assert(data&&typeof data==='object'&&!Array.isArray(data),'GATEWAY_INVALID_'+path);
  results[path]=data;
 }
 const health=results.health;
 assert(health.status==='ok'&&health.authenticated_transport===true&&
  health.direct_model_access===false&&health.prod_execution_enabled===false&&
  health.live_writes===false,'UNSAFE_GATEWAY_HEALTH_CONTRACT');
 const contract=results.contract;
 assert(contract.gateway_required===true&&contract.direct_model_access===false&&
  contract.prod_execution_enabled===false&&contract.trading_access===false,
  'UNSAFE_GATEWAY_OPERATIONAL_CONTRACT');
 const engines=results.engines.engines;
 assert(Array.isArray(engines)&&engines.length>=3,'GATEWAY_ENGINE_REGISTRY_MISSING');
 const allowed=new Set(['CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001']);
 assert(engines.every(x=>allowed.has(x.engine_id)),'UNEXPECTED_ENGINE_AUTHORITY');
 return {status:'OWNER_GATEWAY_LIVE_READONLY_GREEN',negative_owner_gate:true,
  route_count:endpoints.length,declared_engines:engines.length,
  prod_writes:false,provider_calls:0,customer_records_read:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 inspectOwnerGateway({jwt:process.env.CEREBRO_E2E_USER_JWT,
  publishableKey:process.env.PROD_SUPABASE_PUBLISHABLE_KEY})
  .then(result=>console.log('JARVIS_CUT40_'+JSON.stringify(result)))
  .catch(error=>{console.error('JARVIS_CUT40_OWNER_GATE_BLOCKED '+error.message);
   process.exitCode=1});
}
