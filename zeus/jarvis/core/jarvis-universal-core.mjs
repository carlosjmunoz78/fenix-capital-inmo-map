/** ZEUS/JARVIS universal core V0. Standalone, no network calls, no credentials. */
export const CORE_ID='ZEUS:JARVIS:OWNER_ROOT';
export const CORE_VERSION='0.1.0';
export const HUMAN_REASONS=Object.freeze(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
export const STATES=Object.freeze(['RECEIVED','AUTHORIZED','PLANNED','DISPATCHED','SUCCEEDED','FAILED','HUMAN_REQUIRED','CANCELLED']);
export const DEFAULT_POLICY=Object.freeze({mutationsEnabled:false,crossCompanyDelegation:false,externalMessaging:false,paymentEnabled:false,secretRevealEnabled:false});

function requiredString(v,field,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new TypeError(`${field}_INVALID`);return v.trim();}
function stableJson(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(stableJson).join(',')}]`;return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`;}
function clone(v){return structuredClone(v);}
function redact(value){if(value==null)return value;if(Array.isArray(value))return value.map(redact);if(typeof value==='object'){const out={};for(const [k,v] of Object.entries(value)){out[k]=/(password|secret|token|authorization|cookie|api[_-]?key|session[_-]?key|private[_-]?key)/i.test(k)?'[REDACTED]':redact(v);}return out;}return value;}

/** Injected store must survive process restarts for cross-device continuity. */
export class MemoryEventStore {
  constructor(){this.byMission=new Map();this.byIdempotency=new Map();}
  async findByIdempotency(scope,key){return clone(this.byIdempotency.get(`${scope}:${key}`)??null);}
  async get(id){return clone(this.byMission.get(id)??null);}
  async put(mission){const m=clone(mission);this.byMission.set(m.id,m);this.byIdempotency.set(`${m.ownerId}:${m.companyId}:${m.idempotencyKey}`,m);return clone(m);}
  async createIfAbsent(m){const previous=await this.findByIdempotency(`${m.ownerId}:${m.companyId}`,m.idempotencyKey);return previous??this.put(m);}
  async list(ownerId){return [...this.byMission.values()].filter(m=>m.ownerId===ownerId).map(clone);}
}

/**
 * identityProvider.verify(token) => authenticated {ownerId, roles, authorizedCompanies, sessionId}
 * dispatcher.execute({mission,capability}) => {status,evidence}; only trusted, governed dispatcher allowed.
 */
export class JarvisUniversalCore {
  constructor({identityProvider,store,capabilities,dispatcher,policy=DEFAULT_POLICY,clock=()=>new Date().toISOString(),ids=()=>crypto.randomUUID()}){
    if(!identityProvider?.verify||!store?.get||!store?.put||!store?.findByIdempotency)throw new TypeError('SECURE_ADAPTERS_REQUIRED');
    this.identityProvider=identityProvider;this.store=store;this.capabilities=capabilities??new Map();this.dispatcher=dispatcher;this.policy={...DEFAULT_POLICY,...policy};this.clock=clock;this.ids=ids;
  }
  async #principal(token){if(token==null||(typeof token==='string'&&!token))throw new Error('AUTH_REQUIRED');const p=await this.identityProvider.verify(token);if(!p?.ownerId||!p.sessionId||!Array.isArray(p.authorizedCompanies))throw new Error('AUTH_DENIED');if(!p.roles?.includes('OWNER_ROOT'))throw new Error('OWNER_ROOT_REQUIRED');return p;}
  #checkCompany(principal,companyId){if(!principal.authorizedCompanies.includes(companyId))throw new Error('COMPANY_SCOPE_DENIED');}
  async submit({token,companyId,projectId,intent,idempotencyKey,channel='unknown',payload={}}){
    const p=await this.#principal(token);const company=requiredString(companyId,'COMPANY_ID',100);this.#checkCompany(p,company);
    const key=requiredString(idempotencyKey,'IDEMPOTENCY_KEY',180),action=requiredString(intent,'INTENT',100);
    const project=requiredString(projectId,'PROJECT_ID',150),ch=requiredString(channel,'CHANNEL',50);
    if(payload==null||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('PAYLOAD_INVALID');
    const scope=`${p.ownerId}:${company}`;const prior=await this.store.findByIdempotency(scope,key);
    if(prior){if(prior.intent!==action||prior.projectId!==project||stableJson(prior.request)!==stableJson(redact(payload)))throw new Error('IDEMPOTENCY_CONFLICT');return {mission:prior,replayed:true};}
    const at=this.clock();const mission={id:this.ids(),coreId:CORE_ID,coreVersion:CORE_VERSION,ownerId:p.ownerId,companyId:company,projectId:project,intent:action,idempotencyKey:key,request:redact(payload),channel:ch,status:'RECEIVED',events:[{type:'RECEIVED',at,channel:ch}],createdAt:at,updatedAt:at,environment:'PROD',engineId:'JARVIS-CORE-001'};
    if(typeof this.store.createIfAbsent==='function'){
      const persisted=await this.store.createIfAbsent(mission);
      if(persisted.id!==mission.id){
        if(persisted.intent!==action||persisted.projectId!==project||stableJson(persisted.request)!==stableJson(redact(payload)))throw new Error('IDEMPOTENCY_CONFLICT');
        return {mission:persisted,replayed:true};
      }
      return {mission:persisted,replayed:false};
    }
    await this.store.put(mission);return{mission,replayed:false};
  }
  async inspect({token,missionId}){const p=await this.#principal(token);const m=await this.store.get(requiredString(missionId,'MISSION_ID'));if(!m||m.ownerId!==p.ownerId)throw new Error('MISSION_NOT_FOUND');this.#checkCompany(p,m.companyId);return m;}
  async execute({token,missionId}){
    const p=await this.#principal(token);let m=await this.inspect({token,missionId});
    if(m.status!=='RECEIVED')return{mission:m,replayed:true};
    const capability=this.capabilities.get(m.intent);
    let state='HUMAN_REQUIRED',reason='POLICY_CONFLICT';
    if(capability?.companyIds && !capability.companyIds.includes(m.companyId))reason='POLICY_CONFLICT';
    else if(!capability)reason='LOW_CONFIDENCE';
    else if(capability.mutating&&!this.policy.mutationsEnabled)reason='HIGH_RISK';
    else if(capability.requiresHuman)reason=HUMAN_REASONS.includes(capability.requiresHuman)?capability.requiresHuman:'HIGH_RISK';
    else if(capability.mutating&&!this.dispatcher?.execute)reason='HIGH_RISK';
    else{state='AUTHORIZED';reason=null;}
    const at=this.clock();m.status=state;m.updatedAt=at;m.events.push({type:state,at,...(reason?{reason}:{})});m=await this.store.put(m);
    if(state==='HUMAN_REQUIRED')return{mission:m,replayed:false};
    // V0: verified deterministic read-only capabilities only. No generic natural-language model invocations.
    if(capability.mutating){m.status='HUMAN_REQUIRED';m.events.push({type:'HUMAN_REQUIRED',at:this.clock(),reason:'HIGH_RISK'});m=await this.store.put(m);return{mission:m,replayed:false};}
    try{const result=await capability.run({companyId:m.companyId,projectId:m.projectId,ownerId:p.ownerId,request:clone(m.request)});m.status='SUCCEEDED';m.result=redact(result);m.events.push({type:'SUCCEEDED',at:this.clock()});}
    catch(e){m.status='FAILED';m.errorCode='CAPABILITY_EXECUTION_FAILED';m.events.push({type:'FAILED',at:this.clock()});}
    m.updatedAt=this.clock();m=await this.store.put(m);return{mission:m,replayed:false};
  }
}