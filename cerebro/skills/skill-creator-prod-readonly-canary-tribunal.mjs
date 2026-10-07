import fs from 'node:fs';
import path from 'node:path';

function assert(condition,message){if(!condition) throw new Error(message);}

export function judgeSkillCreatorProdReadonlyCanary(report){
  const blockers=[];
  const add=(condition,code)=>{if(!condition) blockers.push(code);};
  add(report?.status==='GREEN_SKILL_CREATOR_PROD_READONLY_CANARY','CANARY_NOT_GREEN');
  add(report?.company_id==='GLOBAL'&&report?.engine_id==='FACT-001'&&report?.environment==='PROD_CANARY','CONTEXT_MISMATCH');
  add(report?.target_candidate==='skill-creator','TARGET_MISMATCH');
  add(report?.target_candidate_id==='lobehub-skills:950cf07380d1daa6de69','CANDIDATE_ID_MISMATCH');
  add(report?.wrapper_id==='skillwrap:cerebro-skill-creator-v0.1.0','WRAPPER_ID_MISMATCH');
  add(report?.live_requests===2&&Array.isArray(report?.methods_used)&&report.methods_used.length===1&&report.methods_used[0]==='GET','READONLY_REQUEST_CONTRACT_FAILED');
  add(Array.isArray(report?.fixture_probes)&&report.fixture_probes.length===3,'FIXTURE_COUNT_MISMATCH');
  for(const probe of report?.fixture_probes??[]){
    add(probe.constraint_coverage===100,`CONSTRAINT_COVERAGE_${probe.fixture_id}`);
    add(probe.policy_conflict===false,`POLICY_CONFLICT_${probe.fixture_id}`);
    add(probe.prod_authorized===false&&probe.prod_write_authorized===false,`PROD_AUTH_${probe.fixture_id}`);
    add(probe.external_skill_code_execution===false,`EXTERNAL_CODE_${probe.fixture_id}`);
  }
  const highRisk=(report?.fixture_probes??[]).find(x=>x.fixture_id==='direct-tool-high-risk');
  add(highRisk?.human_required==='HIGH_RISK','HIGH_RISK_EXCEPTION_NOT_PRESERVED');
  add(Number(report?.observability_records)===5&&Number(report?.audit_records)===5&&Number(report?.finops_records)===5,'LEDGER_COUNTS_MISMATCH');
  add(report?.audit_chain_valid===true,'AUDIT_CHAIN_INVALID');
  add(report?.measured_additional_cost_eur===0,'NONZERO_COST');
  add(report?.prod_write===false&&report?.github_write===false,'WRITE_FLAG_TRUE');
  add(report?.merge_performed===false&&report?.push_performed===false&&report?.issue_or_pr_mutation===false&&report?.workflow_dispatch_performed===false,'GITHUB_MUTATION_DETECTED');
  add(report?.customer_data_used===false&&report?.prod_data_used===false&&report?.credentials_exposed===false,'DATA_OR_CREDENTIAL_SCOPE_BREACH');
  add(report?.external_skill_code_executed===false&&report?.trading_access===false&&report?.paid_fallback===false,'FORBIDDEN_EXECUTION_PATH');
  add(report?.rollback_proven===true&&report?.binding_after==='DISABLED','ROLLBACK_NOT_PROVEN');
  add(report?.rebuild_proven===true&&report?.rebuild_state==='DISABLED','REBUILD_NOT_PROVEN');
  add(report?.prod_write_authorized===false&&report?.prod_authorized===false&&report?.autonomous_promotion_authorized===false,'AUTHORIZATION_EXPANDED');
  const green=blockers.length===0;
  return Object.freeze({schema_version:'0.1.0',green,decision:green?'GREEN_FOR_CONTROLLED_READONLY_ADVISORY_PROMOTION_REVIEW':'HOLD_SKILL_CREATOR_PROD_READONLY_CANARY',human_required:green?'HIGH_RISK':null,next_gate:green?'CONTROLLED_READONLY_ADVISORY_PROMOTION_REVIEW':'REMEDIATE_CANARY',prod_authorized:false,prod_write_authorized:false,merge_authorized:false,autonomous_promotion_authorized:false,blockers});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){const input=arg('--input')??'artifacts/cerebro-skill-creator-prod-readonly-canary.json';const output=arg('--output')??'artifacts/cerebro-skill-creator-prod-readonly-canary-tribunal.json';assert(fs.existsSync(input),'CANARY_REPORT_REQUIRED');const report=JSON.parse(fs.readFileSync(input,'utf8'));const verdict=judgeSkillCreatorProdReadonlyCanary(report);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(verdict,null,2)}\n`,'utf8');console.log(JSON.stringify(verdict));if(!verdict.green) process.exitCode=1;}
