import fs from 'node:fs';
import path from 'node:path';

const CANDIDATE_ID='lobehub-skills:9a6e3fac20369220df43';

function unsafe(report){
  return report?.prod_authorized===true||report?.prod_write_authorized===true||report?.trading_access===true||report?.external_skill_code_execution===true||report?.live_obsidian_cli_execution===true||report?.canonical_knowledge_replaced===true||report?.notion_or_rag_migration_authorized===true||Number(report?.additional_cost_eur??0)!==0;
}

export function judgeObsidianAdmission({oldVsNew,staticReview}={}){
  const blockers=[];
  if(oldVsNew?.candidate_id!==CANDIDATE_ID) blockers.push('CANDIDATE_ID_MISMATCH');
  if(oldVsNew?.status!=='GREEN_FOR_GOVERNED_ADMISSION_REVIEW') blockers.push('OLD_VS_NEW_NOT_GREEN');
  if(oldVsNew?.measurable_improvement!==true) blockers.push('NO_MEASURABLE_IMPROVEMENT');
  if(oldVsNew?.every_case_improves!==true) blockers.push('NOT_EVERY_CASE_IMPROVES');
  if(oldVsNew?.all_hard_gates_green!==true) blockers.push('HARD_GATES_NOT_GREEN');
  if((oldVsNew?.cases??[]).length!==3) blockers.push('FIXTURE_COUNT_NOT_EXACT');
  if(unsafe(oldVsNew)) blockers.push('OLD_VS_NEW_AUTHORITY_OR_COST_REGRESSION');
  if(staticReview?.status!=='GREEN_FOR_SYNTHETIC_BEHAVIORAL_REVIEW') blockers.push('STATIC_WRAPPER_REVIEW_NOT_GREEN');
  if(staticReview?.target?.candidate_id!==CANDIDATE_ID) blockers.push('STATIC_TARGET_MISMATCH');
  if(staticReview?.external_skill_code_executed!==false||staticReview?.live_obsidian_cli_executed!==false||staticReview?.filesystem_write_performed!==false) blockers.push('STATIC_REVIEW_SIDE_EFFECT_DRIFT');
  if(staticReview?.canonical_knowledge_migration_authorized!==false||staticReview?.prod_authorized!==false||staticReview?.prod_write_authorized!==false||staticReview?.trading_access!==false) blockers.push('STATIC_REVIEW_AUTHORITY_DRIFT');
  if(Number(staticReview?.measured_additional_cost_eur??0)!==0) blockers.push('STATIC_REVIEW_COST_DRIFT');
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_OBSIDIAN_INDEPENDENT_ADMISSION_JUDGE',
    candidate_id:CANDIDATE_ID,
    alias_es:'Asistente seguro de conocimiento en Obsidian',
    independent_from_upstream_skill:true,
    evidence_scope:'STATIC_WRAPPER_PLUS_SYNTHETIC_OLD_VS_NEW_ONLY',
    green,
    decision:green?'GREEN_FOR_ADMISSION_TRIBUNAL':'HOLD',
    blockers,
    admission_authorized:false,
    execution_authorized:false,
    install_authorized:false,
    live_obsidian_cli_execution:false,
    canonical_knowledge_migration_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0,
    human_required:null
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const oldVsNew=JSON.parse(fs.readFileSync(arg('--old-vs-new'),'utf8'));
  const staticReview=JSON.parse(fs.readFileSync(arg('--static-review'),'utf8'));
  const output=arg('--output')??'artifacts/cerebro-obsidian-admission-judge-v1.json';
  const report=judgeObsidianAdmission({oldVsNew,staticReview});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({decision:report.decision,green:report.green,blockers:report.blockers}));
  if(!report.green) process.exitCode=1;
}
