import fs from 'node:fs';
import path from 'node:path';

function boolFlag(value){return String(value??'').toLowerCase()==='true';}

export function behavioralExecutionGate({oldVsNew,routeAudit,quotaPlan,env=process.env}={}){
  if(!oldVsNew||!routeAudit||!quotaPlan) throw new TypeError('oldVsNew, routeAudit and quotaPlan required');
  const blockers=[];
  if((oldVsNew.packages??[]).length===0) blockers.push('NO_BEHAVIORAL_PACKAGES');
  if(routeAudit.status!=='READY_ZERO_COST_ROUTE'||!routeAudit.selected_route) blockers.push('ZERO_COST_ROUTE_NOT_READY');
  if(quotaPlan.executable!==true) blockers.push('FREE_QUOTA_PLAN_NOT_EXECUTABLE');
  if(quotaPlan.paid_fallback!==false) blockers.push('PAID_FALLBACK_FORBIDDEN');
  if(routeAudit.synthetic_only!==true) blockers.push('SYNTHETIC_ONLY_REQUIRED');
  if(!boolFlag(env.CEREBRO_BEHAVIORAL_EXECUTION_ENABLED)) blockers.push('EXPLICIT_EXECUTION_ENABLE_MISSING');
  if(boolFlag(env.CEREBRO_ALLOW_PROD_DATA)) blockers.push('PROD_DATA_FORBIDDEN');
  if(boolFlag(env.CEREBRO_ALLOW_CUSTOMER_DATA)) blockers.push('CUSTOMER_DATA_FORBIDDEN');
  const allowed=blockers.length===0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'BEHAVIORAL_EXECUTION_GATE_ONLY',
    allowed,
    blockers,
    provider_id:routeAudit.selected_route?.provider_id??null,
    packages_total:(oldVsNew.packages??[]).length,
    planned_calls:quotaPlan.planned_calls??null,
    synthetic_only:true,
    paid_fallback:false,
    additional_cost_target_eur:0,
    external_skill_code_execution:false,
    prod_data_allowed:false,
    customer_data_allowed:false,
    prod_authorized:false,
    promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const oldVsNew=JSON.parse(fs.readFileSync(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-p0.json','utf8'));
  const routeAudit=JSON.parse(fs.readFileSync(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.json','utf8'));
  const quotaPlan=JSON.parse(fs.readFileSync(argValue('--quota')??'artifacts/cerebro-skill-free-quota-plan.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-behavioral-execution-gate.json';
  const report=behavioralExecutionGate({oldVsNew,routeAudit,quotaPlan});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,allowed:report.allowed,blockers:report.blockers,provider_id:report.provider_id,packages_total:report.packages_total,synthetic_only:true,paid_fallback:false,prod_authorized:false}));
}
