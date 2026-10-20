import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableHash } from './governed-wrapper-factory-v1.mjs';
import { loadSkillEvolutionPolicy } from './skill-evolution-planner-v1.mjs';

const DEFAULT_REGISTRY_URL=new URL('../../registry/skill-operational-wrapper-registry-v1.json',import.meta.url);

function readJsonFile(file){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

export function buildSkillEvolutionReviewQueue(registry,{requested_at_utc=new Date().toISOString()}={}){
  const policy=loadSkillEvolutionPolicy();
  if(!registry||!Array.isArray(registry.wrappers))throw new Error('SKILL_EVOLUTION_REGISTRY_WRAPPERS_REQUIRED');

  const reviews=registry.wrappers.map(wrapper=>{
    const baseline={
      candidate_id:String(wrapper.candidate_id??''),
      wrapper_id:String(wrapper.wrapper_id??''),
      technical_name:String(wrapper.technical_name??''),
      wrapper_ref:String(wrapper.wrapper_ref??''),
      source_locator:String(wrapper.source_locator??''),
      source_license:String(wrapper.source_license??''),
      pinned_sha:String(wrapper.pinned_sha??''),
      status:String(wrapper.status??'')
    };
    if(!baseline.technical_name)throw new Error('SKILL_EVOLUTION_TECHNICAL_NAME_REQUIRED');

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

  const queue={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_EVOLUTION_REVIEW_QUEUE_V1',
    policy_id:policy.policy_id,
    company_id:String(registry.company_id??'GLOBAL'),
    engine_id:'LRN-001',
    environment:'PREPROD',
    requested_at_utc,
    status:'GREEN_REVIEW_QUEUE_READY',
    baseline_registry_version:String(registry.version??registry.schema_version??''),
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
  return readJsonFile(DEFAULT_REGISTRY_URL);
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
