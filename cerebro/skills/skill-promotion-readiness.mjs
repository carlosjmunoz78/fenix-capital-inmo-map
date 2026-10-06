import fs from 'node:fs';
import path from 'node:path';

export function assessPromotionReadiness({staticLab,oldVsNew,routeAudit,quotaPlan,behavioralGate,rsiShadow,behavioralResults=null,independentJudge=null,tribunal=null,rollback=null}={}){
  const blockers=[];
  const evidence={};
  evidence.static_lab_green=(staticLab?.results??[]).filter(x=>x.status==='STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL').length;
  evidence.old_vs_new_packages=oldVsNew?.packages_total??(oldVsNew?.packages??[]).length;
  evidence.zero_cost_route=routeAudit?.status??'MISSING';
  evidence.quota_executable=quotaPlan?.executable===true;
  evidence.behavioral_gate_allowed=behavioralGate?.allowed===true;
  evidence.rsi_shadow_green=rsiShadow?.bridge_status==='SHADOW_BRIDGE_GREEN';
  evidence.behavioral_results_present=Boolean(behavioralResults?.results?.length)&&behavioralResults?.status==='PROXY_COMPLETE';
  evidence.independent_judge_green=independentJudge?.decision==='GREEN_FOR_TRIBUNAL_REVIEW'&&independentJudge?.green===true;
  evidence.tribunal_green=tribunal?.decision==='GREEN';
  evidence.rollback_proven=rollback?.ready===true&&rollback?.status==='GREEN_ROLLBACK_REBUILD_PROOF';
  evidence.rollback_scope=rollback?.proof_scope??'MISSING';

  if(evidence.static_lab_green===0) blockers.push('NO_STATIC_LAB_GREEN_CANDIDATES');
  if(evidence.old_vs_new_packages===0) blockers.push('OLD_VS_NEW_PACKAGES_MISSING');
  if(evidence.zero_cost_route!=='READY_ZERO_COST_ROUTE') blockers.push('ZERO_COST_ROUTE_NOT_READY');
  if(!evidence.quota_executable) blockers.push('FREE_QUOTA_PLAN_NOT_EXECUTABLE');
  if(!evidence.behavioral_gate_allowed) blockers.push('BEHAVIORAL_EXECUTION_GATE_CLOSED');
  if(!evidence.rsi_shadow_green) blockers.push('RSI_SHADOW_NOT_GREEN');
  if(!evidence.behavioral_results_present) blockers.push('BEHAVIORAL_OLD_VS_NEW_NOT_EXECUTED');
  if(!evidence.independent_judge_green) blockers.push('INDEPENDENT_JUDGE_NOT_GREEN');
  if(!evidence.tribunal_green) blockers.push('TRIBUNAL_NOT_GREEN');
  if(!evidence.rollback_proven) blockers.push('ROLLBACK_PROOF_MISSING');

  const ready=blockers.length===0;
  return Object.freeze({
    schema_version:'0.2.0',
    execution_mode:'PROMOTION_READINESS_EVIDENCE_ONLY',
    ready,
    status:ready?'READY_FOR_PREPROD_PROMOTION_REVIEW':'NOT_READY',
    blockers,
    evidence,
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false,
    human_required:ready?'HIGH_RISK':null
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-promotion-readiness.json';
  const report=assessPromotionReadiness({
    staticLab:load(argValue('--static-lab')??'artifacts/cerebro-skill-static-lab-p0.json'),
    oldVsNew:load(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-p0.json'),
    routeAudit:load(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.json'),
    quotaPlan:load(argValue('--quota')??'artifacts/cerebro-skill-free-quota-plan.json'),
    behavioralGate:load(argValue('--behavioral-gate')??'artifacts/cerebro-skill-behavioral-execution-gate.json'),
    rsiShadow:load(argValue('--rsi-shadow')??'artifacts/cerebro-skill-rsi-shadow.json'),
    behavioralResults:load(argValue('--behavioral-results')),
    independentJudge:load(argValue('--independent-judge')),
    tribunal:load(argValue('--tribunal')),
    rollback:load(argValue('--rollback'))
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,ready:report.ready,blockers:report.blockers,evidence:report.evidence,merge_authorized:false,prod_authorized:false}));
}
