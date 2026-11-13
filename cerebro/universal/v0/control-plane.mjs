import crypto from 'node:crypto';
const HUMAN_CODES=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
const METHODS=['list_capabilities','get_capability','get_engine_status','list_jobs','get_job','get_evidence','submit_command','invoke_read','audit_log'];
const error=s=>{throw Error(s);};
const value=(v,name)=>typeof v==='string'&&v.length>0&&v.length<=160?v:error('INVALID_'+name);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>structuredClone(v);
const stable=v=>JSON.stringify(v,Object.keys(v).sort());
const required=['company_id','engine_id','environment','version'];
export class UniversalGatewayLabV0 {
 #registry; #authenticate; #jobs; #audit=[]; #idem=new Map(); #cap;
 constructor({registry,authenticate,jobs=null}){
  if(!object(registry)||registry.count!==179||registry.engine_ids?.length!==179||new Set(registry.engine_ids).size!==179||registry.defaults?.environment!=='SCAFFOLD'||registry.extension?.prod_authorized!==false||registry.extension?.trading_access!==false) error('REGISTRY_UNSAFE');
  if(typeof authenticate!=='function')error('AUTHENTICATOR_REQUIRED');
  if(jobs!==null&&typeof jobs.listForContext!=='function')error('JOB_READER_REQUIRED');
  this.#registry=clone(registry);this.#authenticate=authenticate;this.#jobs=jobs;
  this.#cap={
   company_id:'SERVER_AUTHENTICATED',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab',
   capability_id:'fact.registry.summary',input_schema:{type:'object',properties:{},additionalProperties:false},
   output_schema:{type:'object'},permissions:['cerebro:factory:inspect'],policy:'READ_ONLY',
   required_secrets:[],side_effects:'NONE',executor:'FACT-001_LOCAL_REGISTRY_SNAPSHOT',
   dependencies:['GOV-001'],health:'LOCAL_LAB_ONLY',evidence_refs:['cerebro/registry/engine-registry.v1.json'],
   rollback:'REMOVE_LAB_WRAPPER',cost_budget_eur:0,human_exception_policy:HUMAN_CODES
  };
 }
 contract(){return{environment:'LAB',version:'0.1.0',auth:'SERVER_SESSION_RESOLVER',writes:false,new_queue:false,external_network:false,trading:false,methods:clone(METHODS),additional_cost_eur:0};}
 async handle({session_token,action,params={}}){
  if(typeof session_token!=='string'||session_token.length<1||session_token.length>8192||/\s/.test(session_token))error('INVALID_SESSION');
  if(!METHODS.includes(action))error('METHOD_NOT_ALLOWED');
  if(!object(params))error('PARAMS_REQUIRED');
  const actor=await this.#authenticate(session_token);
  if(!object(actor)||!value(actor.actor_id,'ACTOR')||!Array.isArray(actor.company_ids)||!Array.isArray(actor.scopes))error('AUTH_DENIED');
  const company_id=value(params.company_id,'COMPANY_ID');
  if(!actor.company_ids.includes(company_id))error('COMPANY_SCOPE_DENIED');
  if(params.environment!=='LAB')error('ENVIRONMENT_LAB_ONLY');
  if(!actor.scopes.includes('cerebro:universal:read'))error('SCOPE_DENIED');
  const can=actor.scopes.includes('cerebro:factory:inspect');
  const cap=can?{...clone(this.#cap),company_id}:null;
  const requireCap=()=>{if(!cap||params.capability_id!==cap.capability_id)error('CAPABILITY_UNAVAILABLE');return cap;};
  const payload=()=>{const p=params.payload??{};if(!object(p)||Object.keys(p).length!==0)error('PAYLOAD_SCHEMA_DENIED');return p;};
  let response;
  switch(action){
   case 'list_capabilities':response={status:'OK',source:'REPOSITORY_SNAPSHOT_NOT_LIVE',capabilities:cap?[cap]:[]};break;
   case 'get_capability':response={status:'OK',source:'REPOSITORY_SNAPSHOT_NOT_LIVE',capability:requireCap()};break;
   case 'get_engine_status':{
    const id=value(params.engine_id,'ENGINE_ID');
    if(!this.#registry.engine_ids.includes(id))error('ENGINE_NOT_REGISTERED');
    response={status:'OK',engine_id:id,defined_in_registry:true,definition_environment:'SCAFFOLD',runtime:'NOT_VERIFIED',lab_read_capabilities:cap&&id==='FACT-001'?[cap.capability_id]:[],source:'REPOSITORY_SNAPSHOT_NOT_LIVE'};break;
   }
   case 'list_jobs':
   case 'get_job':{
    if(!actor.scopes.includes('cerebro:jobs:read'))error('SCOPE_DENIED');
    if(!this.#jobs){response={status:'UNAVAILABLE',source:'NO_LIVE_JOB001_ADAPTER',jobs:null};break;}
    const engine_id=value(params.engine_id,'ENGINE_ID'),version=value(params.version,'VERSION');
    if(!this.#registry.engine_ids.includes(engine_id))error('ENGINE_NOT_REGISTERED');
    const ctx={company_id,engine_id,environment:'LAB',version};
    const got=await this.#jobs.listForContext(ctx);
    if(!Array.isArray(got))error('JOB_READER_INVALID');
    const rows=got.filter(j=>j&&required.every(k=>j.context?.[k]===ctx[k])).map(clone);
    if(action==='get_job')response={status:'OK',source:this.#jobs.source||'JOB001_ADAPTER_UNVERIFIED',job:rows.find(j=>j.job_id===value(params.job_id,'JOB_ID'))??null};
    else response={status:'OK',source:this.#jobs.source||'JOB001_ADAPTER_UNVERIFIED',jobs:rows};
    break;
   }
   case 'get_evidence':response={status:'OK',source:'STATIC_REGISTRY_REFERENCE',evidence_refs:requireCap().evidence_refs,live_test_verified:false};break;
   case 'submit_command':{
    if(!actor.scopes.includes('cerebro:command:dryrun'))error('SCOPE_DENIED');
    if(params.dry_run!==true)error('LAB_WRITES_DISABLED');
    requireCap();payload();
    if(params.engine_id!=='FACT-001'||params.version!==this.#cap.version)error('CAPABILITY_VERSION_MISMATCH');
    const id=value(params.idempotency_key,'IDEMPOTENCY_KEY'),key=actor.actor_id+'|'+company_id+'|'+id;
    const estimate=params.estimated_additional_cost_eur??0;
    if(typeof estimate!=='number'||!Number.isFinite(estimate)||estimate<0)error('INVALID_COST_ESTIMATE');
    if(params.human_exception!==undefined&&!HUMAN_CODES.includes(params.human_exception))error('INVALID_HUMAN_EXCEPTION');
    const fp=crypto.createHash('sha256').update(stable({engine_id:params.engine_id,version:params.version,payload:params.payload||{},estimate,signature:params.signature_required===true,risk:params.risk||'LOW',human_exception:params.human_exception||null})).digest('hex');
    const prior=this.#idem.get(key);if(prior&&prior!==fp)error('IDEMPOTENCY_CONFLICT');
    this.#idem.set(key,fp);
    const reason=estimate>0?'MONEY_LIMIT':params.signature_required===true?'SIGNATURE_REQUIRED':params.risk==='HIGH'?'HIGH_RISK':params.human_exception||null;
    response=reason?{status:'HUMAN_REQUIRED',reason,executed:false,company_id,environment:'LAB',engine_id:'FACT-001',replayed:Boolean(prior)}:{status:'DRY_RUN_VALIDATED',executed:false,company_id,engine_id:'FACT-001',environment:'LAB',version:this.#cap.version,capability_id:this.#cap.capability_id,replayed:Boolean(prior),additional_cost_eur:0};break;
   }
   case 'invoke_read':{
    if(!actor.scopes.includes('cerebro:invoke:read'))error('SCOPE_DENIED');
    requireCap();payload();
    response={status:'READ_EXECUTED',executed:true,company_id,environment:'LAB',engine_id:'FACT-001',capability_id:this.#cap.capability_id,result:{
      engine_registry_count:this.#registry.count,base_engine_count:this.#registry.base_source.base_count,
      extension_ids:clone(this.#registry.extension.added_engine_ids),operational_engine_count:'NOT_VERIFIED',
      source:'REPOSITORY_SNAPSHOT_NOT_LIVE',additional_cost_eur:0
    }};break;
   }
   case 'audit_log':{
    if(!actor.scopes.includes('cerebro:audit:read'))error('SCOPE_DENIED');
    response={status:'OK',source:'LAB_MEMORY_NOT_DURABLE',events:this.#audit.filter(x=>x.company_id===company_id).map(clone)};break;
   }
  }
  this.#audit.push({sequence:this.#audit.length+1,actor_id:actor.actor_id,company_id,environment:'LAB',action,outcome:response.status,engine_id:typeof params.engine_id==='string'?params.engine_id:null});
  return clone(response);
 }
}
