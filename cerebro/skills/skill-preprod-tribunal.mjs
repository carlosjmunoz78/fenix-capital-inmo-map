import fs from 'node:fs';
import path from 'node:path';

export function runSkillPreprodTribunal({preprod,judge,registry,contract}){
  const blockers=[];
  if(preprod?.status!=='PREPROD_INTEGRATION_COMPLETE') blockers.push('PREPROD_NOT_COMPLETE');
  if(judge?.decision!=='GREEN_FOR_PREPROD_TRIBUNAL'||judge?.green!==true) blockers.push('PREPROD_JUDGE_NOT_GREEN');
  if(registry?.capability_id!=='cap:skill-supply-chain'||registry?.owner_engine_id!=='FACT-001') blockers.push('REGISTRY_BINDING_MISMATCH');
  if(registry?.frozen_behavioral_evidence_head!=='135fc29a9b41d7257381c08efea49015db1e71d9') blockers.push('FROZEN_LAB_EVIDENCE_MISMATCH');
  if(contract?.contract_id!=='contract:skill-supply-chain-v0'||contract?.owner_engine_id!=='FACT-001') blockers.push('CONTRACT_MISMATCH');
  if(contract?.invariants?.prod_write_default!==false||contract?.invariants?.external_skill_code_execution_default!==false||contract?.invariants?.paid_fallback_default!==false) blockers.push('CONTRACT_SAFETY_INVARIANT_MISSING');
  if(Number(preprod?.measured_additional_cost_eur)!==0) blockers.push('COST_NOT_ZERO');
  if(preprod?.prod_data_used||preprod?.customer_data_used||preprod?.external_skill_code_executed||preprod?.prod_writes||preprod?.trading_access||preprod?.paid_fallback) blockers.push('UNSAFE_PREPROD_EVIDENCE');
  if(!preprod?.packages?.length||preprod.packages.some(x=>x?.rollback_proof?.ready!==true||x?.rollback_proof?.rebuild_default_disabled!==true)) blockers.push('PHYSICAL_ROLLBACK_REBUILD_NOT_GREEN');
  if(preprod?.audit_chain_valid!==true||Number(preprod?.observability_records??0)<=0||Number(preprod?.audit_records??0)<=0||Number(preprod?.finops_records??0)<=0) blockers.push('OBSERVABILITY_AUDIT_FINOPS_INCOMPLETE');
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'SKILL_SUPPLY_CHAIN_PREPROD_TRIBUNAL',
    decision:green?'GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW':'HOLD',
    green,
    blockers:[...new Set(blockers)],
    human_required:green?'HIGH_RISK':null,
    preprod_runtime_integration_proven:true,
    external_target_side_effects_required:false,
    reason_external_target_side_effects_not_required:'candidate skills are admitted as untrusted advisory guidance behind CEREBRO wrappers; external skill code execution remains forbidden',
    measured_additional_cost_eur:Number(preprod?.measured_additional_cost_eur??0),
    physical_rollback_rebuild_green:green&&preprod.packages.every(x=>x.rollback_proof.ready&&x.rollback_proof.rebuild_default_disabled),
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-preprod-tribunal.json';
  const report=runSkillPreprodTribunal({
    preprod:load(argValue('--preprod')??'artifacts/cerebro-skill-preprod-integration.json'),
    judge:load(argValue('--judge')??'artifacts/cerebro-skill-preprod-judge.json'),
    registry:load(argValue('--registry')??'cerebro/registry/skill-supply-chain-v0.json'),
    contract:load(argValue('--contract')??'cerebro/contracts/skill-supply-chain-v0.json')
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:report.decision,green:report.green,human_required:report.human_required,blockers:report.blockers,prod_authorized:false}));
}
