import fs from 'node:fs';
import path from 'node:path';

const DEFAULTS=Object.freeze({
  max_packages:2,
  max_fixtures_per_package:3,
  max_model_calls:12,
  max_input_chars_per_call:12000,
  max_output_chars_per_call:5000,
  max_retries_per_call:1,
  stop_on_rate_limit:true,
  paid_fallback:false,
  prod_data:false,
  customer_data:false
});

export function buildFreeQuotaPlan(oldVsNew,routeAudit,{limits={}}={}){
  const cfg={...DEFAULTS,...limits};
  const packages=oldVsNew?.packages??[];
  const selected=routeAudit?.selected_route??null;
  const plannedFixtures=packages.reduce((n,p)=>n+Math.min((p.fixtures??[]).length,cfg.max_fixtures_per_package),0);
  const baselineCalls=plannedFixtures;
  const candidateCalls=plannedFixtures;
  const judgeCalls=0;
  const totalCalls=baselineCalls+candidateCalls+judgeCalls;
  const errors=[];
  if(packages.length>cfg.max_packages) errors.push('PACKAGE_CAP_EXCEEDED');
  if(totalCalls>cfg.max_model_calls) errors.push('MODEL_CALL_CAP_EXCEEDED');
  if(cfg.paid_fallback!==false) errors.push('PAID_FALLBACK_FORBIDDEN');
  if(cfg.prod_data!==false||cfg.customer_data!==false) errors.push('NON_SYNTHETIC_DATA_FORBIDDEN');
  if(!selected) errors.push('NO_BOUND_ZERO_COST_ROUTE');
  if(selected&&selected.additional_cost_eur!==0) errors.push('NONZERO_COST_ROUTE_FORBIDDEN');
  const executable=errors.length===0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'QUOTA_PLAN_ONLY',
    provider_id:selected?.provider_id??null,
    packages_total:packages.length,
    fixtures_total:plannedFixtures,
    planned_calls:{baseline:baselineCalls,candidate:candidateCalls,judge:judgeCalls,total:totalCalls},
    limits:cfg,
    executable,
    blockers:errors,
    stop_conditions:['HTTP_429','FREE_QUOTA_EXHAUSTED','PROVIDER_BILLING_REQUIRED','PROVIDER_COST_SIGNAL','POLICY_VIOLATION','SECRET_LEAK_SIGNAL'],
    paid_fallback:false,
    additional_cost_target_eur:0,
    model_calls_executed:0,
    prod_authorized:false,
    promotion_authorized:false
  });
}

export function quotaDecision(plan,{calls_used=0,rate_limited=false,cost_signal_eur=0}={}){
  if(!Number.isInteger(calls_used)||calls_used<0) throw new TypeError('calls_used invalid');
  if(typeof rate_limited!=='boolean') throw new TypeError('rate_limited invalid');
  if(typeof cost_signal_eur!=='number'||!Number.isFinite(cost_signal_eur)||cost_signal_eur<0) throw new TypeError('cost_signal_eur invalid');
  if(rate_limited) return Object.freeze({status:'STOP',reason:'HTTP_429',paid_fallback:false});
  if(cost_signal_eur>0) return Object.freeze({status:'STOP',reason:'MONEY_LIMIT',paid_fallback:false});
  if(!plan?.executable) return Object.freeze({status:'STOP',reason:'PLAN_NOT_EXECUTABLE',paid_fallback:false});
  if(calls_used>=plan.limits.max_model_calls) return Object.freeze({status:'STOP',reason:'FREE_QUOTA_CALL_CAP',paid_fallback:false});
  return Object.freeze({status:'ALLOW_NEXT_SYNTHETIC_CALL',remaining_calls:plan.limits.max_model_calls-calls_used,paid_fallback:false});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const oldnew=JSON.parse(fs.readFileSync(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-p0.json','utf8'));
  const route=JSON.parse(fs.readFileSync(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-free-quota-plan.json';
  const report=buildFreeQuotaPlan(oldnew,route);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,provider_id:report.provider_id,packages_total:report.packages_total,fixtures_total:report.fixtures_total,planned_calls:report.planned_calls,executable:report.executable,blockers:report.blockers,paid_fallback:false,model_calls_executed:0}));
}
