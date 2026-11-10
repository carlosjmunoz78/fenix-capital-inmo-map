// FACT-001: consola opcional, ejecución gobernada obligatoria.
// Zero network, zero credentials, zero provider side effects in this module.
// Service identity MUST be established by external cryptographic verifier;
// never trust "owner" or "automation" statements from command payload.
import {getCapability} from './catalog.mjs';
import {blocked} from './core.mjs';

const own=Object.prototype.hasOwnProperty;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const dimensions=['company_id','engine_id','environment','version'];
const channels=new Set(['owner_order','automation']);
const maxLength=128;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=maxLength&&/^[A-Za-z0-9_.:@/-]+$/.test(x);
const tenantPart=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(v);
const semver=v=>typeof v==='string'&&/^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/.test(v);
function safeScope(s){
 return obj(s)&&tenantPart(s.company_id)&&tenantPart(s.engine_id)&&
  ['LAB','PREPROD','PROD'].includes(s.environment)&&semver(s.version);
}
function permittedEnvelope(e){
 if(!obj(e))return false;
 const expected=['source','context','capability','input','idempotency_key'];
 if(Object.keys(e).some(k=>!expected.includes(k)))return false;
 return channels.has(e.source)&&safeScope(e.context)&&id(e.capability)&&
  (e.input===undefined||obj(e.input))&&
  (e.idempotency_key===undefined||id(e.idempotency_key));
}
// Provider logic remains in existing shared core. The same code path serves
// owner-signed orders and authorized schedules. Only the trusted verifier
// may identify owner vs automation; no direct permission flags from model.
export function createHeadlessCerebro({core,verifySignedOrder,grant}={}){
 if(typeof core?.execute!=='function'||typeof verifySignedOrder!=='function'||typeof grant!=='function')
  throw Error('HEADLESS_TRUST_AND_CORE_REQUIRED');
 return Object.freeze({
  async execute(envelope, transport){
   if(!permittedEnvelope(envelope))return blocked('POLICY_CONFLICT','Invalid signed-command envelope');
   let caller;
   try{caller=await verifySignedOrder({transport,source:envelope.source});}
   catch{return blocked('SECURITY_INCIDENT','Signed service identity verification failed');}
   if(!obj(caller)||caller.client_id!=='cerebro'||!id(caller.actor_id)||!id(caller.identity_ref)||
     caller.source!==envelope.source||caller.verified!==true)
     return blocked('SECURITY_INCIDENT','No verified independent CEREBRO service identity');
   if(envelope.source==='owner_order'&&caller.authority!=='owner_signed_command')
     return blocked('POLICY_CONFLICT','Owner order needs independent owner proof');
   if(envelope.source==='automation'&&caller.authority!=='registered_automation')
     return blocked('POLICY_CONFLICT','Automation must be registered and active');
   const action=getCapability(envelope.capability);
   if(!action||action.status!=='IMPLEMENTED_LAB')
     return blocked('LOW_CONFIDENCE','Capability has not passed its LAB gate');
   if(envelope.context.environment==='PROD'&&action.sideEffect)
     return blocked('HIGH_RISK','PROD write requires approved promotion contract');
   if(action.sideEffect&&!id(envelope.idempotency_key))
     return blocked('POLICY_CONFLICT','Persistent idempotency key required');
   let allowed=false;
   try{allowed=await grant({caller,scope:envelope.context,action,source:envelope.source,input:envelope.input??{}});}
   catch{return blocked('POLICY_CONFLICT','Signed policy decision failed');}
   if(allowed!==true)return blocked('POLICY_CONFLICT','Scope or capability grant denied');
   return core.execute({
    trustedPrincipal:{client_id:'cerebro',actor_id:caller.actor_id,identity_ref:caller.identity_ref},
    context:envelope.context,
    capability:action.id,
    input:envelope.input??{},
    idempotency_key:envelope.idempotency_key
   });
  }
 });
}
