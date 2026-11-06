/**
 * CUT42 · Capability inspector for owner-authenticated JARVIS UI.
 * Read-only existing Gateway GETs. No direct provider, owner secret, or action invocation.
 * A green connection means ONLY the listed read-only contract is proven.
 */

export const JARVIS_GATEWAY_ENGINE_IDS=Object.freeze([
 'CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001'
]);
export type JarvisDiagnosticStatus='VERIFIED_READONLY'|'AUTH_REQUIRED'|'GATEWAY_UNAVAILABLE'|'CONTRACT_MISMATCH';
export type JarvisGatewayDiagnostic={
 status:JarvisDiagnosticStatus;
 checked_at:string;
 transport_verified:boolean;
 owner_authenticated:boolean;
 chat_available:boolean;
 declared_engines:string[];
 total_declared_engines:number;
 full_knowledge_verified:false;
 universal_execution_verified:false;
 voice_device_verified:false;
 reason:string;
};
export type RequestFn=<T>(path:string)=>Promise<{status:number;data:T|null}>;
type Health={status?:string;authenticated_transport?:boolean;direct_model_access?:boolean;prod_execution_enabled?:boolean;live_writes?:boolean;chat_available?:boolean};
type Contract={gateway_required?:boolean;direct_model_access?:boolean;prod_execution_enabled?:boolean;trading_access?:boolean;live_writes?:boolean};
type EngineRegistry={engines?:{engine_id?:string}[]};
const stamp=()=>new Date().toISOString();
const reject=(status:JarvisDiagnosticStatus,reason:string):JarvisGatewayDiagnostic=>({
 status,checked_at:stamp(),transport_verified:false,owner_authenticated:false,chat_available:false,
 declared_engines:[],total_declared_engines:0,full_knowledge_verified:false,
 universal_execution_verified:false,voice_device_verified:false,reason
});
export async function inspectJarvisGateway(
 request:RequestFn
):Promise<JarvisGatewayDiagnostic>{
 // This must run only after the App owner session exists. Even on successful HTTP,
 // a direct browser call cannot independently attest identity: the server checks JWT.
 try{
  const health=await request<Health>('health');
  if(health.status===401||health.status===403)return reject('AUTH_REQUIRED','El Gateway exige una sesión válida del propietario.');
  if(health.status!==200||!health.data)return reject('GATEWAY_UNAVAILABLE','No se pudo consultar el Gateway autenticado.');
  const h=health.data;
  if(h.status!=='ok'||h.authenticated_transport!==true||
   h.direct_model_access!==false||h.prod_execution_enabled!==false||
   h.live_writes!==false||h.chat_available!==true)
   return reject('CONTRACT_MISMATCH','Las garantías del Gateway no coinciden con el contrato seguro.');
  const contract=await request<Contract>('contract');
  if(contract.status===401||contract.status===403)return reject('AUTH_REQUIRED','La sesión no autoriza el contrato del Gateway.');
  if(contract.status!==200||!contract.data)return reject('GATEWAY_UNAVAILABLE','El contrato del Gateway no está disponible.');
  const c=contract.data;
  if(c.gateway_required!==true||c.direct_model_access!==false||
   c.prod_execution_enabled!==false||c.trading_access!==false||
   c.live_writes!==false)
   return reject('CONTRACT_MISMATCH','La política de ejecución del Gateway no es la esperada.');
  const engines=await request<EngineRegistry>('engines');
  if(engines.status===401||engines.status===403)return reject('AUTH_REQUIRED','La sesión no autoriza el listado de motores.');
  if(engines.status!==200||!Array.isArray(engines.data?.engines))
   return reject('GATEWAY_UNAVAILABLE','No hay listado verificable de motores del Gateway.');
  const ids=engines.data.engines.map(x=>x?.engine_id);
  const allowed=new Set<string>(JARVIS_GATEWAY_ENGINE_IDS);
  if(ids.length!==allowed.size||new Set(ids).size!==ids.length||
   !ids.every(id=>typeof id==='string'&&allowed.has(id)))
   return reject('CONTRACT_MISMATCH','El listado real de motores no coincide con el contrato validado.');
  return{
   status:'VERIFIED_READONLY',checked_at:stamp(),transport_verified:true,owner_authenticated:true,
   chat_available:true,declared_engines:ids as string[],
   total_declared_engines:ids.length,full_knowledge_verified:false,
   universal_execution_verified:false,voice_device_verified:false,
   reason:'La sesión permite consultar el Gateway. Memoria integral, voz física y ejecuciones aún requieren pruebas independientes.'
  };
 }catch{return reject('GATEWAY_UNAVAILABLE','Error o tiempo de espera agotado al consultar el Gateway.')}
}
