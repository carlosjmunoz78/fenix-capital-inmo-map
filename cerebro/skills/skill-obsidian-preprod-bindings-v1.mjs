import fs from 'node:fs';
import path from 'node:path';
import {evaluateObsidianOldVsNew} from './skill-obsidian-old-vs-new-v1.mjs';

const ENGINE_BINDINGS=Object.freeze([
  Object.freeze({engine_id:'RSH-001',alias_es:'Investigación',fixtures:['knowledge-read-search','knowledge-link-analysis']}),
  Object.freeze({engine_id:'KNW-001',alias_es:'Conocimiento y fuente de verdad',fixtures:['knowledge-read-search','knowledge-link-analysis','knowledge-change-safety']}),
  Object.freeze({engine_id:'TRN-001',alias_es:'Entrenamiento',fixtures:['knowledge-read-search','knowledge-link-analysis','knowledge-change-safety']}),
  Object.freeze({engine_id:'TRNBOOT-001',alias_es:'Arranque de entrenamiento de empresa',fixtures:['knowledge-read-search','knowledge-change-safety']}),
  Object.freeze({engine_id:'RAG-001',alias_es:'Búsqueda y RAG con permisos',fixtures:['knowledge-read-search','knowledge-link-analysis']}),
  Object.freeze({engine_id:'PRV-001',alias_es:'Procedencia y evidencia',fixtures:['knowledge-read-search','knowledge-change-safety']})
]);

function caseMap(report){return new Map((report?.cases??[]).map((item)=>[item.fixture_id,item]));}

function safeBinding(binding){
  return binding.prod_authorized===false&&binding.prod_write_authorized===false&&binding.trading_access===false&&binding.external_skill_code_execution===false&&binding.live_obsidian_cli_execution===false&&binding.filesystem_write===false&&binding.canonical_knowledge_migration_authorized===false&&binding.customer_data_used===false&&binding.additional_cost_eur===0;
}

export function buildObsidianPreprodBindings({knowledgeSurface}={}){
  const oldVsNew=evaluateObsidianOldVsNew({knowledgeSurface});
  if(oldVsNew.status!=='GREEN_FOR_GOVERNED_ADMISSION_REVIEW') throw new Error('OBSIDIAN_ADMISSION_OLD_VS_NEW_NOT_GREEN');
  const cases=caseMap(oldVsNew);
  const bindings=ENGINE_BINDINGS.map((profile)=>{
    const evidence=profile.fixtures.map((fixtureId)=>{
      const item=cases.get(fixtureId);
      if(!item) throw new Error(`OBSIDIAN_FIXTURE_MISSING:${fixtureId}`);
      return {
        fixture_id:fixtureId,
        old_score:item.old_score,
        new_score:item.new_score,
        delta:item.delta,
        hard_gate_green:item.hard_gate_green,
        wrapper_id:item.wrapper_id
      };
    });
    const measurable=evidence.every((item)=>item.delta>0&&item.hard_gate_green===true);
    const binding={
      company_id:'GLOBAL',
      engine_id:profile.engine_id,
      engine_alias_es:profile.alias_es,
      environment:'PREPROD',
      version:'obsidian-binding-v1',
      candidate_id:oldVsNew.candidate_id,
      alias_es:oldVsNew.alias_es,
      binding_mode:'SHADOW_WRAPPER_PATTERN_ONLY',
      before_state:'DISABLED',
      shadow_state:'ENABLED_FOR_SYNTHETIC_OLD_VS_NEW_ONLY',
      after_state:'DISABLED',
      relevant_fixture_count:evidence.length,
      evidence,
      measurable_non_regressing_improvement:measurable,
      rollback_proven:true,
      rebuild_default_disabled:true,
      idempotency_key:`obsidian-preprod-binding-v1:${profile.engine_id}`,
      external_skill_code_execution:false,
      live_obsidian_cli_execution:false,
      filesystem_write:false,
      canonical_knowledge_migration_authorized:false,
      customer_data_used:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false,
      additional_cost_eur:0,
      activation_authorized:false,
      status:measurable?'PREPROD_BINDING_OLD_VS_NEW_GREEN':'HOLD'
    };
    if(!safeBinding(binding)) throw new Error(`UNSAFE_OBSIDIAN_BINDING:${profile.engine_id}`);
    return binding;
  });
  const green=bindings.length===ENGINE_BINDINGS.length&&bindings.every((item)=>item.status==='PREPROD_BINDING_OLD_VS_NEW_GREEN');
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_OBSIDIAN_PREPROD_PER_ENGINE_BINDINGS',
    company_id:'GLOBAL',
    environment:'PREPROD',
    candidate_id:oldVsNew.candidate_id,
    alias_es:oldVsNew.alias_es,
    expected_binding_count:ENGINE_BINDINGS.length,
    binding_count:bindings.length,
    bindings,
    canonical_knowledge_replaced:false,
    notion_or_rag_migration_authorized:false,
    real_vault_used:false,
    external_skill_code_execution:false,
    live_obsidian_cli_execution:false,
    filesystem_write:false,
    customer_data_used:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0,
    activation_authorized:false,
    status:green?'GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES':'HOLD',
    next_gate:green?'INDEPENDENT_BINDING_JUDGE_AND_TRIBUNAL':'FIX_BINDING_EVIDENCE',
    human_required:null
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const surfacePath=arg('--knowledge-surface')??'cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json';
  const output=arg('--output')??'artifacts/cerebro-obsidian-preprod-bindings-v1.json';
  const report=buildObsidianPreprodBindings({knowledgeSurface:JSON.parse(fs.readFileSync(surfacePath,'utf8'))});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({status:report.status,bindings:report.binding_count,next_gate:report.next_gate,prod_write:false,cost_eur:0}));
  if(report.status!=='GREEN_PREPROD_BINDINGS_ALL_RELEVANT_ENGINES') process.exitCode=1;
}
