import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const JSON_FILES=[
  'contracts/human-operator-job.v0.json',
  'contracts/night-runner.v0.json',
  'contracts/adaptive-conversation-lab.v0.json',
  'contracts/operator-evidence.v0.json',
  'contracts/morning-report.v0.json',
  'scenarios/human-operator-scenario-suite.v0.json'
];
const DOC_FILES=[
  'README.md',
  'BROWSER_ADAPTER_DECISION_V0.md',
  'CREDENTIAL_SESSION_POLICY_V0.md',
  'PHYSICAL_ACCEPTANCE_PLAN_V0.md',
  'DEPENDENCY_MAP_V0.md',
  'RUNBOOK_V0.md',
  'BACKUP_REBUILD_V0.md',
  'AUTONOMY_STATUS_V0.md',
  'CHANGELOG.md'
];
const SECRET_VALUE_KEYS=new Set(['password','secret','access_token','refresh_token','jwt','api_key','apikey','totp_seed','otp','cookie_value','recovery_code','private_key','client_secret']);
const CANONICAL_HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function assert(condition,message){if(!condition)throw new Error(message);}
function read(file){const full=path.join(HERE,file);assert(fs.existsSync(full),`missing:${file}`);return fs.readFileSync(full,'utf8');}
function walk(value,label='root'){
  if(value==null)return;
  if(Array.isArray(value)){value.forEach((item,index)=>walk(item,`${label}[${index}]`));return;}
  if(typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
    assert(!SECRET_VALUE_KEYS.has(key.toLowerCase()),`raw_secret_key_forbidden:${label}.${key}`);
    walk(child,`${label}.${key}`);
  }
}
function assertSafety(object,file){
  walk(object,file);
  const s=object.safety??object.invariants??{};
  if('prod_authorized' in s)assert(s.prod_authorized===false,`${file}:prod_authorized_must_be_false`);
  if('prod_write_authorized' in s)assert(s.prod_write_authorized===false,`${file}:prod_write_authorized_must_be_false`);
  if('trading_access' in s)assert(s.trading_access===false,`${file}:trading_access_must_be_false`);
  if('additional_cost_eur' in s)assert(Number(s.additional_cost_eur)===0,`${file}:cost_must_be_zero`);
  if('additional_cost_target_eur' in object)assert(Number(object.additional_cost_target_eur)===0,`${file}:target_cost_must_be_zero`);
}

for(const file of [...JSON_FILES,...DOC_FILES])assert(read(file).trim().length>0,`empty:${file}`);
for(const file of JSON_FILES){const object=JSON.parse(read(file));assertSafety(object,file);}

const job=JSON.parse(read('contracts/human-operator-job.v0.json'));
assert(job.contract_id==='CEREBRO_HUMAN_OPERATOR_JOB_V0','job_contract_id_drift');
assert(job.invariants?.browser_profile_must_be_dedicated===true,'dedicated_browser_profile_required');
assert(job.invariants?.personal_profile_automation_allowed===false,'personal_profile_must_be_denied');
assert(job.invariants?.kill_switch_required===true,'kill_switch_required');
for(const code of job.canonical_human_required??[])assert(CANONICAL_HUMAN_REQUIRED.has(code),`noncanonical_human_required:${code}`);
assert((job.canonical_human_required??[]).length===CANONICAL_HUMAN_REQUIRED.size,'human_required_set_incomplete');

const runner=JSON.parse(read('contracts/night-runner.v0.json'));
assert(runner.runtime_requirements?.watchdog===true,'watchdog_required');
assert(runner.runtime_requirements?.checkpointing===true,'checkpointing_required');
assert(runner.runtime_requirements?.loop_circuit_breaker===true,'loop_circuit_breaker_required');
assert(runner.checkpoint?.write_after_every_click===false,'checkpoint_per_click_forbidden');

const conversation=JSON.parse(read('contracts/adaptive-conversation-lab.v0.json'));
assert(conversation.roles?.system_under_test==='CEREBRO_REAL','real_cerebro_system_under_test_required');
assert(conversation.personas_reuse?.do_not_create_parallel_population_engine===true,'parallel_persona_engine_forbidden');
assert(conversation.limits?.fixed_application_turn_cap===null,'fixed_application_turn_cap_forbidden');

const evidence=JSON.parse(read('contracts/operator-evidence.v0.json'));
assert(evidence.measurement_rules?.not_measured_may_resolve_previous_failure===false,'no_measurement_resolution_forbidden');
assert(evidence.redaction?.credential_ref_allowed===true,'credential_refs_must_be_allowed');

const scenarios=JSON.parse(read('scenarios/human-operator-scenario-suite.v0.json'));
assert(scenarios.do_not_create_parallel_persona_engine===true,'scenario_parallel_persona_engine_forbidden');
assert(scenarios.safety?.synthetic_accounts_required_for_mutation===true,'synthetic_mutation_account_required');

console.log(JSON.stringify({status:'STATIC_CONTRACT_GREEN',package:'cerebro/human-operator',json_contracts:JSON_FILES.length,docs:DOC_FILES.length,prod_authorized:false,trading_access:false,additional_cost_eur:0}));
