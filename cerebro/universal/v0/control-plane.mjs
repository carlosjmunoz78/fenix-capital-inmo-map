import crypto from 'node:crypto';
import {getLabDependencyStatusV0,assessLabOperationV0,rejectSuspendedTargetV0} from './dependency-policy.mjs';
const HUMAN_CODES=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
const METHODS=['list_capabilities','get_capability','get_engine_status','list_jobs','get_job','list_work_activity','list_owner_sources','get_job001_controls','get_dependency_status','assess_operation','get_staging_suspension_live','capture_staging_suspension','get_fact_attestation_latest','get_evidence','submit_command','invoke_read','audit_log'];
const error=s=>{throw Error(s);};
const value=(v,name)=>typeof v==='string'&&v.length>0&&v.length<=160?v:error('INVALID_'+name);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>structuredClone(v);
const stable=v=>JSON.stringify(v,Object.keys(v).sort());
const required=['company_id','engine_id','environment','version'];
export class UniversalGatewayLabV0 {
 #registry; #authenticate; #jobs;  #workActivity; #ownerSources; #jobControls; #stagingReader; #factAdapter; #audit=[]; #idem=new Map(); #cap;
 constructor({registry,authenticate,jobs=null,workActivity=null,ownerSources=null,jobControls=null,stagingReader=null,factAdapter=null}){
  if(!object(registry)||registry.count!==179||registry.engine_ids?.length!==179||new Set(registry.engine_ids).size!==179||registry.defaults?.environment!=='SCAFFOLD'||registry.extension?.prod_authorized!==false||registry.extension?.trading_access!==false) error('REGISTRY_UNSAFE');
  if(typeof authenticate!=='function')error('AUTHENTICATOR_REQUIRED');
  if(jobs!==null&&typeof jobs.listForContext!=='function')error('JOB_READER_REQUIRED');
  if(workActivity!==null&&typeof workActivity.listForContext!=='function')error('WORK_ACTIVITY_READER_REQUIRED');
  if(ownerSources!==null&&typeof ownerSources.listForContext!=='function')error('OWNER_SOURCES_READER_REQUIRED');
  if(jobControls!==null&&typeof jobControls.listForContext!=='function')error('JOB_CONTROLS_READER_REQUIRED');
  if(stagingReader!==null&&(typeof stagingReader.readForContext!=='function'||typeof stagingReader.captureForContext!=='function'))error('STAGING_READER_REQUIRED');
  if(factAdapter!==null&&(typeof factAdapter.executeForContext!=='function'||typeof factAdapter.latestForContext!=='function'))error('FACT_EXECUTOR_ADAPTER_REQUIRED');
  this.#factAdapter=factAdapter;
  this.#registry=clone(registry);this.#authenticate=authenticate;this.#jobs=jobs;this.#workActivity=workActivity;this.#ownerSources=ownerSources;this.#jobControls=jobControls;this.#stagingReader=stagingReader;
  this.#cap={
   company_id:'SERVER_AUTHENTICATED',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab',
   capability_id:'fact.registry.summary',input_schema:{type:'object',properties:{},additionalProperties:false},
   output_schema:{type:'object'},permissions:['cerebro:factory:inspect'],policy:'READ_ONLY',
   required_secrets:[],side_effects:'NONE',executor:'FACT-001_LOCAL_REGISTRY_SNAPSHOT',
   dependencies:['GOV-001'],health:'LOCAL_LAB_ONLY',evidence_refs:['cerebro/registry/engine-registry.v1.json'],
   rollback:'REMOVE_LAB_WRAPPER',cost_budget_eur:0,human_exception_policy:HUMAN_CODES
  };
 }
 contract(){return{environment:'LAB',version:'0.1.0',auth:'SERVER_SESSION_RESOLVER',writes:false,audit_receipt_writes_enabled:Boolean(this.#factAdapter),business_writes_enabled:false,general_engine_execution:false,lab_deterministic_capabilities:this.#factAdapter?['fact.registry.attest']:[],new_queue:false,external_network:this.#workActivity?'FIXED_OWNER_AUTH_READ_ONLY_ACTIVITY_ENDPOINT':false,trading:false,methods:clone(METHODS),additional_cost_eur:0};}
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
  const attestCap=can&&this.#factAdapter?{
   company_id,engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab',
   capability_id:'fact.registry.attest',input_schema:{type:'object',properties:{},additionalProperties:false},
   output_schema:{type:'object'},permissions:['cerebro:factory:inspect','cerebro:command:dryrun'],
   policy:'LAB_ALLOWLISTED_DETERMINISTIC_EXECUTION',required_secrets:[],
   side_effects:'APPEND_ONLY_LAB_RECEIPT',executor:'CEREBRO_SHARED_LAB_EXECUTOR_V0',
   dependencies:['GOV-001'],health:'LAB_EXECUTION_REQUIRES_E2E',
   evidence_refs:['cerebro/registry/engine-registry.v1.json'],
   rollback:'DISABLE_ADAPTER_OR_REVERT_ISOLATED_LAB_PR',cost_budget_eur:0,
   human_exception_policy:HUMAN_CODES
  }:null;
  const requireCap=()=>{if(!cap||params.capability_id!==cap.capability_id)error('CAPABILITY_UNAVAILABLE');return cap;};
  const payload=()=>{const p=params.payload??{};if(!object(p)||Object.keys(p).length!==0)error('PAYLOAD_SCHEMA_DENIED');return p;};
  let response;
  switch(action){
   case 'list_capabilities':response={status:'OK',source:'REPOSITORY_SNAPSHOT_NOT_LIVE',capabilities:cap?[cap,...(attestCap?[attestCap]:[])]:[]};break;
   case 'get_capability':response={status:'OK',source:'REPOSITORY_SNAPSHOT_NOT_LIVE',capability:params.capability_id===attestCap?.capability_id?attestCap:requireCap()};break;
   case 'get_engine_status':{
    const id=value(params.engine_id,'ENGINE_ID');
    if(!this.#registry.engine_ids.includes(id))error('ENGINE_NOT_REGISTERED');
    response={status:'OK',engine_id:id,defined_in_registry:true,definition_environment:'SCAFFOLD',runtime:'NOT_VERIFIED',lab_read_capabilities:cap&&id==='FACT-001'?[cap.capability_id,...(attestCap?[attestCap.capability_id]:[])]:[],source:'REPOSITORY_SNAPSHOT_NOT_LIVE'};break;
   }
   case 'get_dependency_status':{
    response=getLabDependencyStatusV0({company_id,environment:'LAB'});break;
   }
   case 'assess_operation':{
    if(typeof params.operation!=='string'||params.operation.length>90)
     error('OPERATION_INVALID');
    response=assessLabOperationV0({company_id,environment:'LAB',operation:params.operation});break;
   }
   case 'get_staging_suspension_live':{
    if(!actor.scopes.includes('cerebro:jobs:read'))error('SCOPE_DENIED');
    if(!this.#stagingReader){
     response={status:'UNAVAILABLE',source:'LIVE_STAGING_SUSPENSION_PREPROD',
      reason:'STAGING_READER_NOT_CONNECTED',executed_external_actions:false,prod_execution_enabled:false};
     break;
    }
    const observed=await this.#stagingReader.readForContext({company_id,environment:'LAB',session_token});
    if(!object(observed)||!['OBSERVED','UNAVAILABLE'].includes(observed.status)||
       observed.prod_execution_enabled!==false||observed.executed_external_actions!==false)
     error('STAGING_OBSERVATION_CONTRACT_INVALID');
    response=clone(observed);break;
   }
   case 'capture_staging_suspension':{
    if(!actor.scopes.includes('cerebro:command:dryrun')||!actor.scopes.includes('cerebro:audit:read'))error('SCOPE_DENIED');
    rejectSuspendedTargetV0(params);
    if(Object.keys(params).some(k=>!['company_id','environment','idempotency_key'].includes(k)))
     error('STAGING_CAPTURE_FIELDS_DENIED');
    if(typeof params.idempotency_key!=='string'||!/^lab-observe-[a-z0-9-]{12,48}$/.test(params.idempotency_key))
     error('IDEMPOTENCY_KEY_INVALID');
    if(!this.#stagingReader){
     response={status:'UNAVAILABLE',source:'LIVE_STAGING_SUSPENSION_PREPROD',
      reason:'STAGING_READER_NOT_CONNECTED',executed_external_actions:false,prod_execution_enabled:false};
     break;
    }
    const evidence=await this.#stagingReader.captureForContext({
     company_id,environment:'LAB',session_token,idempotency_key:params.idempotency_key});
    if(!object(evidence)||!['EVIDENCE_PERSISTED','UNAVAILABLE'].includes(evidence.status)||
       evidence.prod_execution_enabled!==false||evidence.executed_external_actions!==false)
     error('STAGING_EVIDENCE_CONTRACT_INVALID');
    response=clone(evidence);break;
   }
   case 'get_fact_attestation_latest':{
    if(!actor.scopes.includes('cerebro:factory:inspect'))error('SCOPE_DENIED');
    if(!this.#factAdapter){
     response={status:'UNAVAILABLE',reason:'FACT_EXECUTOR_NOT_CONNECTED',executed:false,prod_execution_enabled:false};break;
    }
    const latest=await this.#factAdapter.latestForContext({company_id,environment:'LAB',session_token});
    if(!object(latest)||!['OK','UNAVAILABLE'].includes(latest.status)||latest.prod_execution_enabled!==false)
     error('FACT_LATEST_CONTRACT_INVALID');
    response=clone(latest);break;
   }
   case 'list_owner_sources':{
    if(!actor.scopes.includes('cerebro:factory:inspect'))error('SCOPE_DENIED');
    if(!this.#ownerSources){
     response={status:'UNAVAILABLE',source:'EXISTING_OWNER_UNIVERSE_LAB',
      reason:'OWNER_UNIVERSE_NOT_CONNECTED',company_id,registry:{status:'UNAVAILABLE',source_status:'UNVERIFIED',companies:0,projects:0,engine_records:0},
      factory:{status:'UNAVAILABLE',source_status:'UNVERIFIED',catalog_definitions:0,scaffold_directories:0},
      runtime_engines_verified:0,execution_enabled:false,prod_execution_enabled:false,job001_connected:false};
     break;
    }
    const observed=await this.#ownerSources.listForContext({company_id,environment:'LAB',session_token});
    if(!object(observed)||!['OK','PARTIAL','UNAVAILABLE'].includes(observed.status)||observed.execution_enabled!==false||
      observed.prod_execution_enabled!==false||observed.job001_connected!==false)error('OWNER_SOURCES_CONTRACT_INVALID');
    response=clone(observed);
    break;
   }
   case 'get_job001_controls':{
    if(!actor.scopes.includes('cerebro:jobs:read'))error('SCOPE_DENIED');
    if(!this.#jobControls){
     response={status:'UNAVAILABLE',source:'PREPROD_JOB001_CONTROL_METADATA',
      reason:'JOB001_PREPROD_CONTROL_READER_NOT_CONNECTED',control_rows:null,
      enabled_control_rows:null,external_control_rows:null,engine_state_records:null,
      telemetry_records:null,source_environment:'PREPROD',
      job001_queue_connected:false,live_execution_verified:false,prod_execution_enabled:false};break;
    }
    const observation=await this.#jobControls.listForContext({company_id,environment:'LAB',session_token});
    if(!object(observation)||!['OK','UNAVAILABLE'].includes(observation.status)||
      observation.job001_queue_connected!==false||observation.live_execution_verified!==false||
      observation.prod_execution_enabled!==false)error('JOB001_CONTROLS_CONTRACT_INVALID');
    response=clone(observation);
    break;
   }
   case 'list_work_activity':{
    if(!actor.scopes.includes('cerebro:jobs:read'))error('SCOPE_DENIED');
    if(!this.#workActivity){
     response={status:'UNAVAILABLE',source:'GITHUB_ACTIONS',source_status:'UNAVAILABLE',
      reason:'REAL_WORK_ACTIVITY_NOT_CONNECTED',runs:[],observed_at:null,job001_connected:false};
     break;
    }
    const observed=await this.#workActivity.listForContext({company_id,environment:'LAB',session_token});
    if(!object(observed)||!['OK','UNAVAILABLE'].includes(observed.status))error('WORK_ACTIVITY_INVALID');
    response=clone(observed);
    break;
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
    if(params.capability_id==='fact.registry.attest'){
     if(!attestCap)error('CAPABILITY_UNAVAILABLE');
     rejectSuspendedTargetV0(params);payload();
     if(params.engine_id!=='FACT-001'||params.version!=='0.1.0-lab'||params.dry_run!==false)
      error('FACT_ATTEST_CONTRACT_DENIED');
     if(typeof params.idempotency_key!=='string'||!/^lab-fact-attest-[a-z0-9-]{12,48}$/.test(params.idempotency_key))
      error('FACT_ATTEST_IDEMPOTENCY_DENIED');
     if(params.estimated_additional_cost_eur!==undefined&&params.estimated_additional_cost_eur!==0)
      error('FACT_ATTEST_COST_DENIED');
     if(params.risk!==undefined&&params.risk!=='LOW')error('FACT_ATTEST_RISK_DENIED');
     if(params.signature_required===true||params.human_exception!==undefined)error('FACT_ATTEST_HUMAN_REQUIRED');
     if(this.#registry.base_source?.base_count!==177||this.#registry.extension?.preserve_base_ids!==true||
       JSON.stringify(this.#registry.engine_ids.slice(-2))!==JSON.stringify(['HCI-001','MOTION-001']))
      error('FACT_REGISTRY_DRIFT');
     const digest=crypto.createHash('sha256').update(this.#registry.engine_ids.join('|')).digest('hex');
     response={status:'FACT_ATTESTATION_PREPARED',executed:false,company_id,engine_id:'FACT-001',
      environment:'LAB',version:'0.1.0-lab',capability_id:'fact.registry.attest',
      registry_count:179,base_count:177,preserved_base:true,registry_digest:digest,
      prod_execution_enabled:false,external_actions_executed:false,additional_cost_eur:0};break;
    }
    if(params.dry_run!==true)error('LAB_WRITES_DISABLED');
    rejectSuspendedTargetV0(params);
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
