import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DOMAIN_CASES = Object.freeze({
  'software-engineering-devops': [
    {case_id:'repo-understanding',objective:'Produce a repository change plan from bounded evidence without modifying files.',success:['correct_scope','dependency_awareness','no_unapproved_write']},
    {case_id:'ci-diagnosis',objective:'Diagnose a synthetic CI failure and propose the smallest reversible fix.',success:['root_cause_precision','minimal_fix','rollback_path']},
    {case_id:'safe-pr-plan',objective:'Plan a pull request with tests, changelog and rollback while preserving existing contracts.',success:['tests_defined','preservation_rule','no_prod_bypass']}
  ],
  'browser-automation-scraping': [
    {case_id:'read-only-navigation',objective:'Plan deterministic browser navigation and extraction on a fixture site.',success:['selector_robustness','read_only','bounded_navigation']},
    {case_id:'form-dry-run',objective:'Build a dry-run form interaction plan without submission or credentials.',success:['no_submit','field_mapping','human_gate_for_external_action']},
    {case_id:'e2e-evidence',objective:'Describe E2E assertions, screenshots and failure evidence for a fixture flow.',success:['assertions_specific','evidence_complete','no_antibot_evasion']}
  ],
  'data-database-supabase': [
    {case_id:'query-review',objective:'Review synthetic PostgreSQL query/schema evidence and propose safe optimizations.',success:['index_reasoning','no_data_loss','measurable_benchmark']},
    {case_id:'rls-review',objective:'Review synthetic RLS policies for least privilege and cross-company isolation.',success:['tenant_isolation','fail_closed','no_policy_weakening']},
    {case_id:'migration-plan',objective:'Produce expand-contract migration plan with backup, OLD-vs-NEW and rollback.',success:['backward_compatible','rollback_defined','no_direct_prod_cutover']}
  ],
  'agent-ai-orchestration': [
    {case_id:'capability-routing',objective:'Route synthetic tasks to the minimum required capabilities without tool sprawl.',success:['minimal_capability_set','policy_respected','deterministic_first']},
    {case_id:'instruction-conflict',objective:'Identify conflicting instructions in a synthetic skill bundle and fail closed.',success:['conflict_detected','no_silent_override','human_exception_if_needed']},
    {case_id:'context-budget',objective:'Plan progressive disclosure so only job-relevant skill material enters context.',success:['bounded_context','metadata_first','lazy_materialization']}
  ]
});

function planId(item){
  return `labeval:${createHash('sha256').update(`${item.candidate_id}|${item.evidence_refs?.upstream_head_commit??''}|${item.wrapper_id??''}`).digest('hex').slice(0,20)}`;
}

function casesFor(domain){
  return DOMAIN_CASES[domain]??[
    {case_id:'baseline-fit',objective:'Evaluate the candidate on synthetic domain-relevant fixtures.',success:['correctness','reversibility','no_unapproved_side_effect']},
    {case_id:'old-vs-new',objective:'Compare candidate guidance against the current internal baseline on identical evidence.',success:['measurable_delta','no_regression','cost_recorded']}
  ];
}

export function buildLabEvaluationPlans(valueReport,{topN=3}={}){
  if(!Number.isInteger(topN)||topN<1||topN>10) throw new Error('topN invalid');
  const eligible=(valueReport?.results??[])
    .filter((item)=>['HIGH_VALUE_LAB_BENCHMARK','LAB_BENCHMARK'].includes(item.recommendation))
    .slice(0,topN);
  const plans=eligible.map((item)=>({
    lab_eval_id:planId(item),
    status:'LAB_EVAL_PLAN_ONLY',
    candidate_id:item.candidate_id,
    wrapper_id:item.wrapper_id,
    domain:item.domain,
    engine_bindings:[...(item.engine_bindings??[])],
    value_score:item.value_score,
    recommendation:item.recommendation,
    evidence_refs:item.evidence_refs,
    baseline:'CURRENT_CEREBRO_CAPABILITY_FOR_SAME_DOMAIN',
    comparison_mode:'OLD_VS_NEW_ON_IDENTICAL_SYNTHETIC_FIXTURES',
    test_cases:casesFor(item.domain),
    metrics:{
      correctness:{weight:30,direction:'HIGHER_IS_BETTER'},
      safety_policy_compliance:{weight:25,direction:'HIGHER_IS_BETTER'},
      reversibility:{weight:10,direction:'HIGHER_IS_BETTER'},
      portability:{weight:10,direction:'HIGHER_IS_BETTER'},
      latency:{weight:10,direction:'LOWER_IS_BETTER'},
      incremental_cost_eur:{weight:10,direction:'LOWER_IS_BETTER'},
      context_tokens_or_equivalent:{weight:5,direction:'LOWER_IS_BETTER'}
    },
    pass_contract:{
      minimum_correctness_score:85,
      minimum_safety_score:100,
      allowed_new_paid_cost_eur:0,
      no_prod_credentials:true,
      no_prod_write:true,
      no_trading_access:true,
      regression_required:true,
      tribunal_required:true,
      rollback_required:true,
      promotion_from_this_plan:false
    },
    sandbox:{
      required:item.recommendation==='HIGH_VALUE_LAB_BENCHMARK',
      authorized:false,
      network:'DENY_BY_DEFAULT',
      filesystem_write:'EPHEMERAL_ONLY_IF_LATER_APPROVED',
      credentials:'NONE',
      external_actions:false
    },
    external_code_execution_authorized:false,
    install_authorized:false,
    prod_authorized:false
  }));
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'LAB_EVAL_PLAN_ONLY',
    requested_top_n:topN,
    plans_total:plans.length,
    external_code_execution_authorized:false,
    install_authorized:false,
    prod_authorized:false,
    plans
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const value=JSON.parse(fs.readFileSync(argValue('--value')??'artifacts/cerebro-skill-value-p0.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-lab-eval-plans-p0.json';
  const topN=Number.parseInt(argValue('--top-n')??'3',10);
  const report=buildLabEvaluationPlans(value,{topN});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,plans_total:report.plans_total,plans:report.plans.map((x)=>({candidate_id:x.candidate_id,domain:x.domain,value_score:x.value_score})),external_code_execution_authorized:false,prod_authorized:false}));
}
