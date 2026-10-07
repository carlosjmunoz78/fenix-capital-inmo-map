import fs from 'node:fs';
import path from 'node:path';

export function assessAgentBrowserPromotionReadiness({normalizedAdmission,oldVsNew,routeAudit,quotaPlan,behavioralGate,rsiShadow,behavioralResults,independentJudge,tribunal,rollback}={}){
  const evidence={};
  const blockers=[];
  const admitted=(normalizedAdmission?.results??[]).filter((x)=>x.status==='NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL');
  evidence.normalized_wrapper_green=admitted.length;
  evidence.raw_static_hold_preserved=admitted.length>0&&admitted.every((x)=>x.raw_static_status==='STATIC_LAB_HOLD'&&x.raw_status_preserved===true);
  evidence.raw_static_thresholds_relaxed=false;
  evidence.old_vs_new_packages=oldVsNew?.packages_total??(oldVsNew?.packages??[]).length;
  evidence.zero_cost_route=routeAudit?.status??'MISSING';
  evidence.quota_executable=quotaPlan?.executable===true;
  evidence.planned_calls=quotaPlan?.planned_calls?.total??null;
  evidence.max_model_calls=quotaPlan?.limits?.max_model_calls??null;
  evidence.behavioral_gate_allowed=behavioralGate?.allowed===true;
  evidence.rsi_shadow_green=rsiShadow?.bridge_status==='SHADOW_BRIDGE_GREEN';
  evidence.behavioral_results_present=Boolean(behavioralResults?.results?.length)&&behavioralResults?.status==='PROXY_COMPLETE';
  evidence.behavioral_calls_executed=behavioralResults?.calls_executed??0;
  evidence.independent_judge_green=independentJudge?.decision==='GREEN_FOR_TRIBUNAL_REVIEW'&&independentJudge?.green===true;
  evidence.tribunal_green=tribunal?.decision==='GREEN'&&tribunal?.green===true;
  evidence.rollback_proven=rollback?.ready===true&&rollback?.status==='GREEN_ROLLBACK_REBUILD_PROOF';

  if(evidence.normalized_wrapper_green!==1) blockers.push('EXACTLY_ONE_NORMALIZED_WRAPPER_GREEN_REQUIRED');
  if(!evidence.raw_static_hold_preserved) blockers.push('RAW_STATIC_HOLD_NOT_PRESERVED');
  if(evidence.old_vs_new_packages!==1) blockers.push('EXACTLY_ONE_OLD_VS_NEW_PACKAGE_REQUIRED');
  if(evidence.zero_cost_route!=='READY_ZERO_COST_ROUTE') blockers.push('ZERO_COST_ROUTE_NOT_READY');
  if(!evidence.quota_executable) blockers.push('FREE_QUOTA_PLAN_NOT_EXECUTABLE');
  if(evidence.planned_calls!==6||evidence.max_model_calls!==6) blockers.push('HARD_SIX_CALL_QUOTA_NOT_PROVEN');
  if(!evidence.behavioral_gate_allowed) blockers.push('BEHAVIORAL_EXECUTION_GATE_CLOSED');
  if(!evidence.rsi_shadow_green) blockers.push('RSI_SHADOW_NOT_GREEN');
  if(!evidence.behavioral_results_present||evidence.behavioral_calls_executed!==6) blockers.push('BEHAVIORAL_SIX_CALL_OLD_VS_NEW_NOT_COMPLETE');
  if(!evidence.independent_judge_green) blockers.push('INDEPENDENT_JUDGE_NOT_GREEN');
  if(!evidence.tribunal_green) blockers.push('TRIBUNAL_NOT_GREEN');
  if(!evidence.rollback_proven) blockers.push('ROLLBACK_PROOF_MISSING');

  const ready=blockers.length===0;
  return Object.freeze({
    schema_version:'0.1.0',execution_mode:'AGENT_BROWSER_PROMOTION_READINESS_EVIDENCE_ONLY',ready,
    status:ready?'READY_FOR_PREPROD_PROMOTION_REVIEW':'NOT_READY',blockers,evidence,
    merge_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false,human_required:ready?'HIGH_RISK':null
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=assessAgentBrowserPromotionReadiness({
    normalizedAdmission:load(argValue('--admission')??'artifacts/cerebro-skill-normalized-wrapper-admission-p0.json'),
    oldVsNew:load(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-agent-browser-p0.json'),
    routeAudit:load(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.manual.json'),
    quotaPlan:load(argValue('--quota')??'artifacts/cerebro-skill-free-quota-plan.manual.json'),
    behavioralGate:load(argValue('--behavioral-gate')??'artifacts/cerebro-skill-behavioral-execution-gate.manual.json'),
    rsiShadow:load(argValue('--rsi-shadow')??'artifacts/cerebro-skill-rsi-shadow.json'),
    behavioralResults:load(argValue('--behavioral-results')??'artifacts/cerebro-skill-behavioral-proxy.manual.json'),
    independentJudge:load(argValue('--independent-judge')??'artifacts/cerebro-skill-independent-judge.manual.json'),
    tribunal:load(argValue('--tribunal')??'artifacts/cerebro-skill-agent-browser-tribunal.manual.json'),
    rollback:load(argValue('--rollback')??'artifacts/cerebro-skill-rollback-proof.manual.json')
  });
  const output=argValue('--output')??'artifacts/cerebro-skill-agent-browser-promotion-readiness.manual.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,ready:report.ready,blockers:report.blockers,human_required:report.human_required,merge_authorized:false,prod_authorized:false}));
}
