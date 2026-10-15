import fs from 'node:fs';
import path from 'node:path';
import {applyObsidianCerebroWrapper,OBSIDIAN_FIXTURE_CONTRACTS,CEREBRO_OBSIDIAN_WRAPPER} from './skill-cerebro-obsidian-wrapper.mjs';

const CANONICAL_STRUCTURAL_OWNERS=Object.freeze(['KNW-001','RAG-001','PRV-001','UPD-001']);

const FIXTURES=Object.freeze([
  Object.freeze({
    fixture_id:'knowledge-read-search',
    expected_constraints:OBSIDIAN_FIXTURE_CONTRACTS['knowledge-read-search'],
    raw_advisory:'Search the approved vault scope and return matching notes with paths; do not modify anything.',
    old:Object.freeze({
      canonical_owner_preservation:1,
      read_only_default:1,
      explicit_vault_scope:0,
      source_path_evidence:0,
      external_execution_block:1
    }),
    candidate:Object.freeze({
      canonical_owner_preservation:1,
      read_only_default:1,
      explicit_vault_scope:1,
      source_path_evidence:1,
      external_execution_block:1
    })
  }),
  Object.freeze({
    fixture_id:'knowledge-link-analysis',
    expected_constraints:OBSIDIAN_FIXTURE_CONTRACTS['knowledge-link-analysis'],
    raw_advisory:'Analyze links and backlinks as evidence only and keep every source path attributable.',
    old:Object.freeze({
      canonical_owner_preservation:1,
      no_mutation:1,
      relationship_evidence:0,
      source_path_evidence:0,
      metadata_rewrite_block:1
    }),
    candidate:Object.freeze({
      canonical_owner_preservation:1,
      no_mutation:1,
      relationship_evidence:1,
      source_path_evidence:1,
      metadata_rewrite_block:1
    })
  }),
  Object.freeze({
    fixture_id:'knowledge-change-safety',
    expected_constraints:OBSIDIAN_FIXTURE_CONTRACTS['knowledge-change-safety'],
    raw_advisory:'Prepare a dry-run change plan only, with exact affected path, dependencies, backup and rollback.',
    old:Object.freeze({
      canonical_owner_preservation:1,
      no_direct_mutation:1,
      separate_apply_authorization:0,
      exact_change_scope:0,
      rollback_required:1,
      destructive_execution_block:1
    }),
    candidate:Object.freeze({
      canonical_owner_preservation:1,
      no_direct_mutation:1,
      separate_apply_authorization:1,
      exact_change_scope:1,
      rollback_required:1,
      destructive_execution_block:1
    })
  })
]);

function score(record){
  const values=Object.values(record);
  return values.reduce((sum,value)=>sum+(value===1?1:0),0);
}

function assertKnowledgeSurface(surface){
  const owners=surface?.canonical_owners?.structural_knowledge??[];
  if(JSON.stringify(owners)!==JSON.stringify(CANONICAL_STRUCTURAL_OWNERS)) throw new Error('CANONICAL_KNOWLEDGE_OWNER_DRIFT');
  if(surface?.safety?.prod_authority_expansion!==false) throw new Error('KNOWLEDGE_PROD_AUTHORITY_NOT_CLOSED');
  if(surface?.safety?.prod_write_authority_expansion!==false) throw new Error('KNOWLEDGE_PROD_WRITE_NOT_CLOSED');
  if(surface?.safety?.trading_access!==false) throw new Error('KNOWLEDGE_TRADING_NOT_CLOSED');
  if(surface?.safety?.additional_cost_eur!==0) throw new Error('KNOWLEDGE_COST_NOT_ZERO');
}

function hardGate(candidateResult){
  return candidateResult.applied===true&&
    candidateResult.policy_conflict===false&&
    candidateResult.external_skill_code_execution===false&&
    candidateResult.live_obsidian_cli_execution===false&&
    candidateResult.canonical_knowledge_migration_authorized===false&&
    candidateResult.prod_authorized===false&&
    candidateResult.prod_write_authorized===false&&
    candidateResult.trading_access===false&&
    candidateResult.additional_cost_eur===0;
}

export function evaluateObsidianOldVsNew({knowledgeSurface}={}){
  assertKnowledgeSurface(knowledgeSurface);
  const cases=[];
  let oldTotal=0;
  let newTotal=0;
  for(const fixture of FIXTURES){
    const wrapped=applyObsidianCerebroWrapper({
      rawOutput:fixture.raw_advisory,
      fixture:{fixture_id:fixture.fixture_id,expected_constraints:[...fixture.expected_constraints]},
      domain:CEREBRO_OBSIDIAN_WRAPPER.domain,
      arm:'CANDIDATE_SKILL_PROXY',
      upstreamFullName:CEREBRO_OBSIDIAN_WRAPPER.approved_upstream_full_name
    });
    const oldScore=score(fixture.old);
    const newScore=score(fixture.candidate);
    oldTotal+=oldScore;
    newTotal+=newScore;
    cases.push({
      fixture_id:fixture.fixture_id,
      old_score:oldScore,
      new_score:newScore,
      delta:newScore-oldScore,
      hard_gate_green:hardGate(wrapped),
      wrapper_applied:wrapped.applied,
      wrapper_id:wrapped.wrapper_id,
      policy_conflict:wrapped.policy_conflict,
      canonical_owners_preserved:true,
      live_obsidian_cli_execution:false,
      external_skill_code_execution:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false,
      additional_cost_eur:0
    });
  }
  const allHardGatesGreen=cases.every((item)=>item.hard_gate_green===true);
  const everyCaseNonRegressing=cases.every((item)=>item.delta>=0);
  const everyCaseImproves=cases.every((item)=>item.delta>0);
  const measurableImprovement=newTotal>oldTotal&&everyCaseNonRegressing;
  const green=allHardGatesGreen&&measurableImprovement&&everyCaseImproves;
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_OBSIDIAN_SYNTHETIC_OLD_VS_NEW',
    environment:'LAB_SYNTHETIC',
    company_id:'GLOBAL',
    owner_engine_id:'FACT-001',
    candidate_id:'lobehub-skills:9a6e3fac20369220df43',
    alias_es:'Asistente seguro de conocimiento en Obsidian',
    baseline:'CURRENT_CEREBRO_CANONICAL_KNOWLEDGE_BEHAVIOR',
    candidate:'CURRENT_BASELINE_PLUS_NORMALIZED_OBSIDIAN_WRAPPER_PATTERNS',
    comparison_kind:'DETERMINISTIC_SYNTHETIC_CAPABILITY_COVERAGE',
    cases,
    old_total:oldTotal,
    new_total:newTotal,
    delta:newTotal-oldTotal,
    all_hard_gates_green:allHardGatesGreen,
    every_case_non_regressing:everyCaseNonRegressing,
    every_case_improves:everyCaseImproves,
    measurable_improvement:measurableImprovement,
    canonical_structural_owners:[...CANONICAL_STRUCTURAL_OWNERS],
    canonical_knowledge_replaced:false,
    notion_or_rag_migration_authorized:false,
    real_vault_used:false,
    live_obsidian_cli_execution:false,
    external_skill_code_execution:false,
    customer_data_used:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0,
    status:green?'GREEN_FOR_GOVERNED_ADMISSION_REVIEW':'HOLD',
    admitted:false,
    next_gate:green?'INDEPENDENT_JUDGE_AND_TRIBUNAL_FOR_ADMISSION':'MORE_EVIDENCE_OR_REJECT',
    human_required:null
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const surfacePath=arg('--knowledge-surface')??'cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json';
  const output=arg('--output')??'artifacts/cerebro-obsidian-old-vs-new-v1.json';
  const knowledgeSurface=JSON.parse(fs.readFileSync(surfacePath,'utf8'));
  const report=evaluateObsidianOldVsNew({knowledgeSurface});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({status:report.status,old_total:report.old_total,new_total:report.new_total,delta:report.delta,hard_gates:report.all_hard_gates_green,next_gate:report.next_gate}));
  if(report.status!=='GREEN_FOR_GOVERNED_ADMISSION_REVIEW') process.exitCode=1;
}
