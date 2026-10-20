import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableHash } from './governed-wrapper-factory-v1.mjs';
import { loadSkillEvolutionPolicy } from './skill-evolution-planner-v1.mjs';

const REPO_ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const DEFAULT_BINDING_URL=new URL('../../registry/skill-evolution-policy-binding-v1.json',import.meta.url);

function readJsonFile(file){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

function selectorField(selector){
  const match=String(selector??'').trim().match(/^([A-Za-z0-9_]+)\[\*\]$/);
  if(!match)throw new Error(`SKILL_EVOLUTION_SELECTOR_UNSUPPORTED:${selector}`);
  return match[1];
}

function boundEntries(source){
  const field=selectorField(source.selector);
  const entries=source.registry?.[field];
  if(!Array.isArray(entries))throw new Error(`SKILL_EVOLUTION_BOUND_ARRAY_REQUIRED:${source.registry_ref}:${field}`);
  return entries;
}

function normalizeBaseline(item,source){
  const technicalName=String(item?.technical_name??item?.name??'').trim();
  if(!technicalName)throw new Error(`SKILL_EVOLUTION_TECHNICAL_NAME_REQUIRED:${source.registry_ref}`);
  return {
    candidate_id:String(item?.candidate_id??''),
    wrapper_id:String(item?.wrapper_id??''),
    technical_name:technicalName,
    wrapper_ref:String(item?.wrapper_ref??''),
    source_locator:String(item?.source_locator??item?.upstream??''),
    source_license:String(item?.source_license??item?.license??''),
    pinned_sha:String(item?.pinned_sha??item?.validated_head_sha??''),
    status:String(item?.status??''),
    current_scope:String(item?.current_scope??''),
    source_environment:String(item?.environment??source.registry?.environment??''),
    skill_class:String(source.skill_class??''),
    registry_refs:[String(source.registry_ref??'')].filter(Boolean)
  };
}

function mergeBaselines(existing,incoming){
  const merged={...existing};
  for(const [key,value] of Object.entries(incoming)){
    if(key==='registry_refs')continue;
    if((merged[key]===undefined||merged[key]===null||merged[key]==='')&&value!==undefined&&value!==null&&value!=='')merged[key]=value;
  }
  merged.registry_refs=[...new Set([...(existing.registry_refs??[]),...(incoming.registry_refs??[])])];
  return merged;
}

function normalizeSources(registryOrBundle){
  if(registryOrBundle&&Array.isArray(registryOrBundle.sources))return registryOrBundle.sources;
  if(!registryOrBundle||typeof registryOrBundle!=='object')throw new Error('SKILL_EVOLUTION_REGISTRY_REQUIRED');
  for(const selector of ['wrappers[*]','capabilities[*]','queue[*]']){
    const field=selectorField(selector);
    if(Array.isArray(registryOrBundle[field])){
      return [{registry_ref:'INLINE_REGISTRY',selector,skill_class:'INLINE_SKILL_REGISTRY',registry:registryOrBundle}];
    }
  }
  throw new Error('SKILL_EVOLUTION_REGISTRY_ENTRIES_REQUIRED');
}

export function buildSkillEvolutionReviewQueue(registryOrBundle,{requested_at_utc=new Date().toISOString()}={}){
  const policy=loadSkillEvolutionPolicy();
  const sources=normalizeSources(registryOrBundle);
  const deduped=new Map();
  let rawEntryCount=0;

  for(const source of sources){
    const entries=boundEntries(source);
    rawEntryCount+=entries.length;
    for(const item of entries){
      const baseline=normalizeBaseline(item,source);
      const key=baseline.technical_name.toLowerCase();
      deduped.set(key,deduped.has(key)?mergeBaselines(deduped.get(key),baseline):baseline);
    }
  }

  const reviews=[...deduped.values()]
    .sort((a,b)=>a.technical_name.localeCompare(b.technical_name))
    .map(baseline=>{
      const review={
        review_id:`skill-review:${baseline.technical_name}:${stableHash({baseline,requested_at_utc}).slice(0,16)}`,
        technical_name:baseline.technical_name,
        baseline,
        trigger:'PERIODIC_REVIEW',
        improvement_search_lanes:[...policy.strategies],
        discovery_sources:[
          'UPSTREAM_RELEASES_AND_CHANGELOGS',
          'INTERNAL_EXECUTION_EVIDENCE',
          'TEST_AND_REGRESSION_EVIDENCE',
          'LRN_001_LEARNED_GAPS',
          'COMPLEMENTARY_SKILLS',
          'LOCAL_OR_OPEN_SOURCE_ALTERNATIVES',
          'COST_SAFETY_AND_PERFORMANCE_OPTIMIZATIONS'
        ],
        required_outcome:'EVIDENCE_BACKED_CANDIDATE_OR_NO_CHANGE_WITH_LEARNING',
        candidate_environment:policy.candidate_rules.candidate_environment,
        baseline_immutable_in_prod:true,
        old_vs_new_required:true,
        tribunal_required:true,
        rollback_required:true,
        additional_cost_budget_eur:0
      };
      return {...review,review_hash:stableHash(review)};
    });

  const sourceVersions=Object.fromEntries(sources.map(source=>[
    source.registry_ref,
    String(source.registry?.version??source.registry?.schema_version??'')
  ]));
  const queue={
    schema_version:'1.1.0',
    state_type:'CEREBRO_SKILL_EVOLUTION_REVIEW_QUEUE_V1',
    policy_id:policy.policy_id,
    company_id:String(registryOrBundle?.company_id??'GLOBAL'),
    engine_id:'LRN-001',
    environment:'PREPROD',
    requested_at_utc,
    status:'GREEN_REVIEW_QUEUE_READY',
    baseline_registry_version:sources.length===1?Object.values(sourceVersions)[0]:'MULTI_REGISTRY',
    baseline_registry_versions:sourceVersions,
    source_registry_count:sources.length,
    raw_entry_count:rawEntryCount,
    deduplicated_review_count:reviews.length,
    review_count:reviews.length,
    continuous_improvement_enabled:true,
    learning_loop:'LRN-001',
    candidate_factory:'FACT-001',
    reviews,
    authority:{...policy.authority}
  };
  return Object.freeze({...queue,queue_hash:stableHash(queue)});
}

export function loadDefaultSkillRegistry(){
  const binding=readJsonFile(DEFAULT_BINDING_URL);
  if(!Array.isArray(binding.registry_bindings)||binding.registry_bindings.length<1)throw new Error('SKILL_EVOLUTION_REGISTRY_BINDINGS_REQUIRED');
  const sources=binding.registry_bindings.map(entry=>{
    const registryRef=String(entry.registry_ref??'').trim();
    if(!registryRef)throw new Error('SKILL_EVOLUTION_REGISTRY_REF_REQUIRED');
    const absolute=path.resolve(REPO_ROOT,registryRef);
    if(!fs.existsSync(absolute))throw new Error(`SKILL_EVOLUTION_BOUND_REGISTRY_MISSING:${registryRef}`);
    return {
      registry_ref:registryRef,
      selector:String(entry.selector??''),
      skill_class:String(entry.skill_class??''),
      registry:readJsonFile(absolute)
    };
  });
  return {
    company_id:String(binding.company_id??'GLOBAL'),
    version:String(binding.version??binding.schema_version??''),
    binding_ref:'cerebro/registry/skill-evolution-policy-binding-v1.json',
    sources
  };
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    if(argv[i]==='--registry')out.registry=argv[++i];
    else if(argv[i]==='--output')out.output=argv[++i];
    else if(argv[i]==='--requested-at')out.requested_at_utc=argv[++i];
  }
  return out;
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  const registry=args.registry?readJsonFile(path.resolve(args.registry)):loadDefaultSkillRegistry();
  const queue=buildSkillEvolutionReviewQueue(registry,{requested_at_utc:args.requested_at_utc??new Date().toISOString()});
  const payload=`${JSON.stringify(queue,null,2)}\n`;
  if(args.output){
    const output=path.resolve(args.output);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,payload,'utf8');
  }else{
    process.stdout.write(payload);
  }
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main();
