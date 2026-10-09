import fs from 'node:fs';
import path from 'node:path';
import {ingestSkillCapability} from '../runtime/skill-capability-evolution.mjs';

function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function uniq(values){return [...new Set((values??[]).filter((value)=>text(value)).map((value)=>value.trim()))].sort();}
function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}

function enabledSubscribers(report){
  return (report?.subscribers??[]).filter((item)=>
    item?.enabled===true&&
    item?.environment==='PREPROD'&&
    item?.prod_authorized===false&&
    item?.trading_access===false&&
    text(item?.company_id)
  );
}

function versionFor(plan){
  const direct=text(plan?.provenance?.upstream_head_commit)||text(plan?.provenance?.manifest_sha256)||text(plan?.wrapper_id);
  return direct??'unversioned-static-prelab';
}

function riskFor(plan){
  const flags=plan?.quality?.bundle_static_flags??[];
  if(flags.some((flag)=>String(flag).toUpperCase().includes('SECURITY'))) return 'MEDIUM';
  return 'LOW';
}

function manifestFor(plan,companyId){
  const domain=text(plan?.domain)??'unknown-domain';
  return {
    company_id:companyId,
    environment:'PREPROD',
    skill_id:text(plan?.candidate_id)??text(plan?.wrapper_id),
    skill_version:versionFor(plan),
    capabilities:[`domain:${domain}`],
    inputs:[],
    outputs:[],
    tags:[domain],
    permissions:[],
    risk_class:riskFor(plan),
    source:'SKILL_SUPPLY_CHAIN_STATIC_PRELAB',
    additional_cost_eur:0,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false
  };
}

function engineDescriptors(plan,companyId,knownIds){
  const domain=text(plan?.domain)??'unknown-domain';
  const requested=uniq(plan?.engine_bindings);
  const accepted=requested.filter((engineId)=>knownIds.has(engineId));
  const rejected=requested.filter((engineId)=>!knownIds.has(engineId));
  return {
    accepted,
    rejected,
    engines:accepted.map((engineId)=>({
      company_id:companyId,
      engine_id:engineId,
      version:'0.1.0',
      capabilities:[`domain:${domain}`],
      inputs:[],
      outputs:[],
      tags:[domain],
      autonomy_state:'ASSISTED'
    }))
  };
}

export function buildSkillCapabilityEvolutionBridge({wrappers,subscribers,engineRegistry,registryFile,minimumScore=0.20}={}){
  if(!text(registryFile)) throw new Error('registryFile required');
  const knownIds=new Set(engineRegistry?.engine_ids??[]);
  if(!knownIds.size) throw new Error('engineRegistry.engine_ids must not be empty');
  const tenants=enabledSubscribers(subscribers);
  const plans=(wrappers?.plans??[]).filter((plan)=>
    plan?.status==='WRAPPER_PLAN_ONLY'&&
    plan?.enabled===false&&
    plan?.execution_authorized===false&&
    plan?.install_authorized===false&&
    plan?.prod_authorized===false
  );
  const results=[];
  for(const tenant of tenants){
    for(const plan of plans){
      const skill=manifestFor(plan,tenant.company_id);
      if(!text(skill.skill_id)) continue;
      const descriptors=engineDescriptors(plan,tenant.company_id,knownIds);
      const evolution=ingestSkillCapability({skill,engines:descriptors.engines,registry_file:registryFile,minimum_score:minimumScore});
      results.push({
        company_id:tenant.company_id,
        candidate_id:plan.candidate_id,
        wrapper_id:plan.wrapper_id,
        skill_id:skill.skill_id,
        skill_version:skill.skill_version,
        accepted_engine_bindings:descriptors.accepted,
        rejected_unknown_engine_bindings:descriptors.rejected,
        status:evolution.status,
        registration:{accepted:evolution.registration.accepted,duplicate:evolution.registration.duplicate,record_hash:evolution.registration.record_hash},
        impact:evolution.impact,
        plans:evolution.plans,
        next_gate:evolution.next_gate,
        prod_authorized:false,
        prod_write_authorized:false,
        trading_access:false,
        additional_cost_eur:0
      });
    }
  }
  const experiments=results.reduce((sum,item)=>sum+item.plans.length,0);
  const gaps=results.filter((item)=>item.impact.gap_detected).length;
  const unknownBindings=results.reduce((sum,item)=>sum+item.rejected_unknown_engine_bindings.length,0);
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_CAPABILITY_EVOLUTION_AUTO_HOOK',
    environment:'PREPROD',
    execution_mode:'AUTOMATIC_SAFE_PLANNING_ONLY',
    tenants_processed:tenants.length,
    admitted_wrappers_processed:results.length,
    old_vs_new_experiments_ready:experiments,
    capability_gaps:gaps,
    unknown_engine_bindings_rejected:unknownBindings,
    learning_path:'EXISTING_SKILL_OUTBOX_TO_UNIVERSAL_INGRESS_TO_LRN001',
    behavior_execution_authorized:false,
    install_authorized:false,
    factory_create_authorized:false,
    supervisor_gate_required:true,
    tribunal_gate_required:true,
    rollback_required:true,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0,
    results
  });
}

if(import.meta.url===`file://${process.argv[1]}`){
  const wrapperPath=argValue('--wrappers')??'artifacts/cerebro-skill-wrapper-plans-p0.json';
  const subscribersPath=argValue('--subscribers')??'cerebro/registry/rsi-learning-subscribers.v0.json';
  const engineRegistryPath=argValue('--engine-registry')??'cerebro/registry/engine-registry.seed.json';
  const registryFile=argValue('--registry')??'artifacts/cerebro-skill-capability-registry.v8';
  const output=argValue('--output')??'artifacts/cerebro-skill-capability-evolution.json';
  const wrappers=JSON.parse(fs.readFileSync(wrapperPath,'utf8'));
  const subscribers=JSON.parse(fs.readFileSync(subscribersPath,'utf8'));
  const engineRegistry=JSON.parse(fs.readFileSync(engineRegistryPath,'utf8'));
  const report=buildSkillCapabilityEvolutionBridge({wrappers,subscribers,engineRegistry,registryFile});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({
    output,
    environment:report.environment,
    tenants_processed:report.tenants_processed,
    admitted_wrappers_processed:report.admitted_wrappers_processed,
    old_vs_new_experiments_ready:report.old_vs_new_experiments_ready,
    capability_gaps:report.capability_gaps,
    behavior_execution_authorized:false,
    prod_authorized:false,
    additional_cost_eur:0
  }));
}
