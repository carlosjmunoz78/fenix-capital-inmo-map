import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_BINDINGS=Object.freeze(['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);

function assert(condition,message){if(!condition) throw new Error(message);}
function sameList(a,b){return Array.isArray(a)&&a.length===b.length&&a.every((x,i)=>x===b[i]);}

export function validateObsidianProdAuthorization(authorization){
  const blockers=[];
  const add=(condition,code)=>{if(!condition) blockers.push(code);};
  add(authorization?.confirm==='RUN_OBSIDIAN_PROD_READONLY_CANARY','AUTH_CONFIRM_MISMATCH');
  add(authorization?.scope==='PROD_OBSIDIAN_READONLY_ADVISORY_ONLY','AUTH_SCOPE_MISMATCH');
  add(authorization?.target_candidate==='obsidian'&&authorization?.target_candidate_id==='lobehub-skills:9a6e3fac20369220df43','AUTH_TARGET_MISMATCH');
  add(authorization?.expected_wrapper_id==='skillwrap:cerebro-obsidian-v0.1.0','AUTH_WRAPPER_MISMATCH');
  add(authorization?.company_id==='GLOBAL'&&authorization?.engine_id==='FACT-001'&&authorization?.environment==='PROD_CANARY','AUTH_CONTEXT_MISMATCH');
  add(authorization?.additional_cost_budget_eur===0,'AUTH_NONZERO_COST');
  add(Array.isArray(authorization?.allowed_http_methods)&&authorization.allowed_http_methods.length===1&&authorization.allowed_http_methods[0]==='GET','AUTH_METHOD_SCOPE_MISMATCH');
  add(authorization?.allow_prod_data===false&&authorization?.allow_customer_data===false,'AUTH_DATA_SCOPE_EXPANDED');
  add(authorization?.allow_external_skill_code_execution===false&&authorization?.allow_prod_write===false&&authorization?.allow_filesystem_write===false&&authorization?.allow_live_obsidian_cli===false,'AUTH_EXECUTION_SCOPE_EXPANDED');
  add(authorization?.allow_canonical_knowledge_migration===false&&authorization?.allow_notion_or_rag_replacement===false,'AUTH_KNOWLEDGE_SCOPE_EXPANDED');
  add(authorization?.allow_github_write===false&&authorization?.allow_merge===false&&authorization?.allow_push===false&&authorization?.allow_issue_or_pr_mutation===false&&authorization?.allow_workflow_dispatch===false,'AUTH_GITHUB_SCOPE_EXPANDED');
  add(authorization?.allow_trading_access===false&&authorization?.paid_fallback===false,'AUTH_FORBIDDEN_SCOPE_EXPANDED');
  add(authorization?.expected_human_gate==='HIGH_RISK'&&authorization?.human_authorization_granted===true,'AUTH_HIGH_RISK_NOT_GRANTED');
  add(typeof authorization?.authorization_basis==='string'&&authorization.authorization_basis.includes('2026-10-16')&&authorization.authorization_basis.includes('obsidian'),'AUTH_BASIS_MISSING');
  add(typeof authorization?.one_shot_id==='string'&&authorization.one_shot_id.length>=16,'AUTH_ONE_SHOT_ID_INVALID');
  return Object.freeze({green:blockers.length===0,blockers});
}

export function judgeObsidianProdReadonlyCanary(report,{authorization=null}={}){
  const blockers=[];
  const add=(condition,code)=>{if(!condition) blockers.push(code);};
  add(report?.status==='GREEN_OBSIDIAN_PROD_READONLY_CANARY','CANARY_NOT_GREEN');
  add(report?.company_id==='GLOBAL'&&report?.engine_id==='FACT-001'&&report?.environment==='PROD_CANARY','CONTEXT_MISMATCH');
  add(report?.target_candidate==='obsidian','TARGET_MISMATCH');
  add(report?.target_candidate_id==='lobehub-skills:9a6e3fac20369220df43','CANDIDATE_ID_MISMATCH');
  add(report?.wrapper_id==='skillwrap:cerebro-obsidian-v0.1.0','WRAPPER_ID_MISMATCH');
  add(sameList(report?.target_engine_bindings,EXPECTED_BINDINGS),'ENGINE_BINDINGS_MISMATCH');
  add(report?.live_requests===2&&Array.isArray(report?.methods_used)&&report.methods_used.length===1&&report.methods_used[0]==='GET','READONLY_REQUEST_CONTRACT_FAILED');
  add(Array.isArray(report?.fixture_probes)&&report.fixture_probes.length===3,'FIXTURE_COUNT_MISMATCH');
  for(const probe of report?.fixture_probes??[]){
    add(probe.constraint_coverage===100,`CONSTRAINT_COVERAGE_${probe.fixture_id}`);
    add(probe.policy_conflict===false,`POLICY_CONFLICT_${probe.fixture_id}`);
    add(probe.prod_authorized===false&&probe.prod_write_authorized===false,`PROD_AUTH_${probe.fixture_id}`);
    add(probe.external_skill_code_execution===false&&probe.live_obsidian_cli_execution===false,`EXTERNAL_OR_CLI_EXECUTION_${probe.fixture_id}`);
    add(probe.canonical_knowledge_migration_authorized===false,`KNOWLEDGE_MIGRATION_${probe.fixture_id}`);
  }
  const mutationProbe=(report?.fixture_probes??[]).find(x=>x.fixture_id==='knowledge-change-safety');
  add(mutationProbe?.human_required==='HIGH_RISK','MUTATION_HIGH_RISK_EXCEPTION_NOT_PRESERVED');
  add(Number(report?.observability_records)===5&&Number(report?.audit_records)===5&&Number(report?.finops_records)===5,'LEDGER_COUNTS_MISMATCH');
  add(report?.audit_chain_valid===true,'AUDIT_CHAIN_INVALID');
  add(report?.measured_additional_cost_eur===0,'NONZERO_COST');
  add(report?.prod_write===false&&report?.filesystem_write===false&&report?.live_obsidian_cli_execution===false&&report?.real_vault_used===false,'WRITE_OR_LIVE_VAULT_FLAG_TRUE');
  add(report?.canonical_knowledge_replaced===false&&report?.notion_or_rag_migration_authorized===false,'KNOWLEDGE_REPLACEMENT_DETECTED');
  add(report?.github_write===false&&report?.merge_performed===false&&report?.push_performed===false&&report?.issue_or_pr_mutation===false&&report?.workflow_dispatch_performed===false,'GITHUB_MUTATION_DETECTED');
  add(report?.customer_data_used===false&&report?.prod_data_used===false&&report?.credentials_exposed===false,'DATA_OR_CREDENTIAL_SCOPE_BREACH');
  add(report?.external_skill_code_executed===false&&report?.trading_access===false&&report?.paid_fallback===false,'FORBIDDEN_EXECUTION_PATH');
  add(report?.rollback_proven===true&&report?.binding_after==='DISABLED','ROLLBACK_NOT_PROVEN');
  add(report?.rebuild_proven===true&&report?.rebuild_state==='DISABLED','REBUILD_NOT_PROVEN');
  add(report?.prod_write_authorized===false&&report?.prod_authorized===false&&report?.autonomous_business_prod_write_authorized===false,'BUSINESS_PROD_AUTHORIZATION_EXPANDED');
  const auth=validateObsidianProdAuthorization(authorization);
  if(!auth.green) blockers.push(...auth.blockers.map(x=>`AUTH:${x}`));
  const green=blockers.length===0;
  return Object.freeze({schema_version:'0.1.0',green,decision:green?'GREEN_FOR_OBSIDIAN_PROD_READONLY_ADVISORY_REGISTRATION':'HOLD_OBSIDIAN_PROD_READONLY_CANARY',human_required:green?null:'HIGH_RISK',authorization_consumed:green,registration_scope:green?'PROD_READONLY_ADVISORY_METADATA_ONLY':null,next_gate:green?'REGISTER_OBSIDIAN_PROD_READONLY_ADVISORY':'REMEDIATE_CANARY_OR_AUTHORIZATION',prod_authorized:false,prod_write_authorized:false,filesystem_write_authorized:false,canonical_knowledge_migration_authorized:false,merge_authorized:false,autonomous_business_prod_write_authorized:false,blockers});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){const input=arg('--input')??'artifacts/cerebro-obsidian-prod-readonly-canary.json';const authorizationPath=arg('--authorization');const output=arg('--output')??'artifacts/cerebro-obsidian-prod-readonly-canary-tribunal.json';assert(fs.existsSync(input),'CANARY_REPORT_REQUIRED');assert(authorizationPath&&fs.existsSync(authorizationPath),'OBSIDIAN_PROD_AUTHORIZATION_REQUIRED');const report=JSON.parse(fs.readFileSync(input,'utf8'));const authorization=JSON.parse(fs.readFileSync(authorizationPath,'utf8'));const verdict=judgeObsidianProdReadonlyCanary(report,{authorization});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(verdict,null,2)}\n`,'utf8');console.log(JSON.stringify(verdict));if(!verdict.green) process.exitCode=1;}
