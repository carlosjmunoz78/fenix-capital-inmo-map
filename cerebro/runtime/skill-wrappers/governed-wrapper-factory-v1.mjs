import crypto from 'node:crypto';

export const SAFE_INTERNAL_MODES=Object.freeze(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE','TRANSFORM','GENERATE','VALIDATE','SIMULATE','INTERNAL_BUILD','EXECUTE_INTERNAL']);
const SAFE_MODE_SET=new Set(SAFE_INTERNAL_MODES);

function stable(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
}

export function stableHash(value){
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function cleanText(value,max=2000){
  return typeof value==='string'?value.trim().slice(0,max):'';
}

export function cleanStringList(value,{maxItems=32,maxLength=180}={}){
  if(!Array.isArray(value))return [];
  return value.slice(0,maxItems).map(item=>cleanText(item,maxLength)).filter(Boolean);
}

function assertConfig(config){
  for(const key of ['wrapper_id','candidate_id','technical_name','source_license','pinned_sha','default_engine']){
    if(typeof config?.[key]!=='string'||!config[key].trim())throw new Error(`WRAPPER_CONFIG_${key.toUpperCase()}_REQUIRED`);
  }
  if(!config?.tasks||typeof config.tasks!=='object'||Array.isArray(config.tasks)||Object.keys(config.tasks).length===0)throw new Error('WRAPPER_CONFIG_TASKS_REQUIRED');
}

export function createGovernedInternalWrapper(config){
  assertConfig(config);
  const version=String(config.version??'1.0.0');
  const tasks=new Map(Object.entries(config.tasks).map(([name,builder])=>[String(name).toUpperCase(),builder]));
  const defaultTask=String(config.default_task??tasks.keys().next().value).toUpperCase();
  if(!tasks.has(defaultTask))throw new Error('WRAPPER_CONFIG_DEFAULT_TASK_UNKNOWN');

  return function executeGovernedInternalCapability({mode='PLAN',request={},context={}}={}){
    if(!SAFE_MODE_SET.has(mode))throw new Error(`${config.technical_name.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}_MODE_NOT_SAFE_INTERNAL`);
    if(/TRAD|TRADING/i.test(String(context?.engine_id??'')))throw new Error('TRADING_BINDING_DENIED');
    if(context?.candidate_id&&String(context.candidate_id)!==config.candidate_id)throw new Error('WRAPPER_CANDIDATE_MISMATCH');

    const task=String(request?.task??defaultTask).toUpperCase();
    const builder=tasks.get(task);
    if(typeof builder!=='function')throw new Error(`${config.technical_name.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}_TASK_NOT_SUPPORTED`);

    const goal=cleanText(request?.goal,1000);
    const built=builder({request,context,mode,task,goal,cleanText,cleanStringList});
    if(!built||typeof built!=='object'||Array.isArray(built))throw new Error('WRAPPER_TASK_OUTPUT_INVALID');

    const result={
      schema_version:'1.0.0',
      state_type:'CEREBRO_INTERNAL_SKILL_EXECUTION_RESULT',
      wrapper_id:config.wrapper_id,
      wrapper_version:version,
      candidate_id:config.candidate_id,
      technical_name:config.technical_name,
      company_id:String(context?.company_id??'fenix'),
      engine_id:String(context?.engine_id??config.default_engine),
      environment:'PROD_CAPABILITY',
      mode,
      task,
      goal,
      output:{
        ...built,
        requires_dependency_install:false,
        requires_external_execution:false,
        requires_external_side_effect:false
      },
      provenance:{
        implementation_kind:'CEREBRO_INTERNAL_REIMPLEMENTATION_FROM_LICENSED_KNOWLEDGE',
        source_name:config.technical_name,
        source_license:config.source_license,
        source_pinned_sha:config.pinned_sha,
        raw_external_skill_code_executed:false
      },
      authority:{
        prod_capability_internal_execution:true,
        prod_write_authorized:false,
        prod_mutation_authorized:false,
        external_side_effects_authorized:false,
        external_skill_code_execution:false,
        dependency_install_authorized:false,
        trading_access:false,
        spend_authorized:false,
        additional_cost_eur:0
      }
    };

    return Object.freeze({...result,result_hash:stableHash(result)});
  };
}
