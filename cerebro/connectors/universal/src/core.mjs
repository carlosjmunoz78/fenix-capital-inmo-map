import { createHash, randomUUID } from 'node:crypto';
import { CLIENTS, DIMENSIONS, getCapability, inventory } from './catalog.mjs';

const HUMAN = new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const allowedEnvironments = new Set(['LAB','PREPROD','PROD']);
const forbiddenInAudit = /authorization|bearer|api[_-]?key|secret|password|token|cookie/i;
const safeObj = v => v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
function nonempty(v, name){ if(typeof v!=='string'||!v.trim()) throw new TypeError(`${name} required`);return v.trim(); }
export function digest(value){ return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function inMemoryIdempotency(){
 const entries=new Map();
 return {
  durable:false,
  async claim(key,fingerprint){
   const prior=entries.get(key);
   if(!prior){entries.set(key,{fingerprint,status:'IN_PROGRESS'});return {status:'CLAIMED'};}
   if(prior.fingerprint!==fingerprint)return {status:'CONFLICT'};
   if(prior.status==='COMPLETE')return {status:'REPLAY',result:prior.result};
   return {status:'PENDING'};
  },
  async complete(key,fingerprint,result){
   const prior=entries.get(key);
   if(!prior||prior.fingerprint!==fingerprint||prior.status!=='IN_PROGRESS')throw new Error('IDEMPOTENCY_STATE_CONFLICT');
   entries.set(key,{fingerprint,status:'COMPLETE',result});
  }
 };
}
export function blocked(reason, detail) {if(!HUMAN.has(reason)) throw new Error('invalid HUMAN_REQUIRED reason');return {status:'HUMAN_REQUIRED',reason,detail,executed:false};}

export class UniversalConnectorCore {
  constructor({cloudflare, opera, vercel, supabaseAdmin, authorize, idempotency, audit, costGuard}={}) {
    if(typeof authorize!=='function') throw new Error('trusted authorize callback required');
    if(typeof audit!=='function') throw new Error('audit sink required');
    if(!idempotency || typeof idempotency.claim!=='function' || typeof idempotency.complete!=='function') throw new Error('atomic idempotency store required');
    if(typeof costGuard!=='function') throw new Error('cost guard required');
    this.cloudflare=cloudflare;
    this.opera=opera;
    this.vercel=vercel;
    this.supabaseAdmin=supabaseAdmin;
    this.authorize=authorize;
    this.audit=audit;
    this.idempotency=idempotency;
    this.costGuard=costGuard;
  }

  capabilities(){return inventory();}

  async execute({trustedPrincipal, context, capability, input={}, idempotency_key}={}){
    if(!safeObj(trustedPrincipal)) return blocked('SECURITY_INCIDENT','Authenticated principal not supplied by trusted adapter');
    if(!CLIENTS.includes(trustedPrincipal.client_id)) return blocked('POLICY_CONFLICT','Unknown client identity');
    if(!safeObj(context) || !DIMENSIONS.every(key=>typeof context[key]==='string'&&context[key].trim())) return blocked('POLICY_CONFLICT','Invalid 4-dimensional scope');
    if(!allowedEnvironments.has(context.environment)) return blocked('POLICY_CONFLICT','Unsupported environment');
    if(!safeObj(input)) return blocked('POLICY_CONFLICT','Input must be plain object');
    const action=getCapability(capability);
    if(!action) return blocked('LOW_CONFIDENCE','Capability not registered');
    if(action.status!=='IMPLEMENTED_LAB') return blocked('LOW_CONFIDENCE',`Capability ${action.id} is ${action.status}`);
    if(context.environment==='PROD' && action.sideEffect) return blocked('HIGH_RISK','PROD write requires separate, reviewed promotion contract');
    const provider=action.id.startsWith('cloudflare.')?this.cloudflare:action.id.startsWith('opera.')?this.opera:action.id.startsWith('vercel.')?this.vercel:action.id.startsWith('supabase-admin.')?this.supabaseAdmin:null;
    if(!provider) return blocked('LOW_CONFIDENCE','Provider adapter unavailable');
    const identity = {client_id:trustedPrincipal.client_id, actor_id:nonempty(trustedPrincipal.actor_id,'actor_id'), identity_ref:nonempty(trustedPrincipal.identity_ref,'identity_ref')};
    const scope = {company_id:context.company_id,engine_id:context.engine_id,environment:context.environment,version:context.version};
    const attempt_id=randomUUID();
    const makeAudit=(outcome)=>this.audit({attempt_id, timestamp:new Date().toISOString(), capability:action.id, client_id:identity.client_id, actor_id:identity.actor_id, ...scope, outcome});
    try {
      const permit = await this.authorize({identity,scope,action,input});
      if(permit!==true){makeAudit('DENIED');return blocked('POLICY_CONFLICT','Client permission denied');}
      if(action.sideEffect){
        if(this.idempotency.durable!==true){makeAudit('DENIED');return blocked('POLICY_CONFLICT','Durable idempotency required for live mutations');}
        if(scope.environment!=='LAB') {makeAudit('DENIED');return blocked('HIGH_RISK','LAB-only mutation');}
        if(await this.costGuard({identity,scope,action,input})!==true){makeAudit('MONEY_LIMIT');return blocked('MONEY_LIMIT','Cost 0 € / Free quota not attested');}
        if(!idempotency_key || typeof idempotency_key!=='string'){makeAudit('DENIED');return blocked('POLICY_CONFLICT','Durable idempotency key required');}
        const key=`${identity.client_id}:${identity.identity_ref}:${scope.company_id}:${scope.environment}:${idempotency_key}`;
        const fingerprint=digest({capability:action.id,scope,input});
        const lease=await this.idempotency.claim(key,fingerprint);
        if(lease.status==='CONFLICT'){makeAudit('REJECTED_CONFLICT');return blocked('POLICY_CONFLICT','Idempotency key collision');}
        if(lease.status==='REPLAY'){makeAudit('REPLAY');return lease.result;}
        if(lease.status==='PENDING'){makeAudit('PENDING');return blocked('LOW_CONFIDENCE','Mutation pending / unknown outcome; reconcile before retry');}
        const output=await provider.perform({action,scope,input,identity});
        if(output.status==='COMPLETED' || output.status==='ALREADY_EXISTS_VERIFIED')await this.idempotency.complete(key,fingerprint,output);
        makeAudit(output.status);return output;
      }
      const output=await provider.perform({action,scope,input,identity});
      makeAudit(output.status);return output;
    }catch(err){makeAudit('ERROR');return blocked('LOW_CONFIDENCE',`Execution or verification failed (${err.code??'UNSPECIFIED'})`);}
  }
}

export function createAuditSink(){
 const events=[];
 return {record(e){for(const key of Object.keys(e))if(forbiddenInAudit.test(key))throw new Error(`forbidden audit key ${key}`); events.push(Object.freeze({...e}));},list(){return events.map(e=>({...e}));}};
}