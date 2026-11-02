const ALLOWED_ENVIRONMENTS=new Set(['LAB','PREPROD']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const PARTIAL_PATHS={
  'INN-001':['cerebro/runtime/cerebro-engineering-specializations-evidence-sweep-v1.mjs','cerebro/runtime/cerebro-technical-specialists-v1.mjs','cerebro/runtime/compet-real-consumer-adoption-v1.mjs','cerebro/runtime/technology-capability-scout-real-consumer-adoption-v1.mjs'],
  'LAB-MKT':['cerebro/integrations/canva/canva-capability-router-v1.mjs','cerebro/integrations/canva/canva-capability-router-v1.test.mjs'],
  'EXPAND-001':['cerebro/runtime/compet-real-consumer-adoption-v1.mjs']
};
export const ENGINE_DEFINITIONS=Object.freeze([
  {engine_id:'STR-001',name:'Strategy Engine',mode:'strategy'},
  {engine_id:'FRC-001',name:'Forecasting Engine',mode:'forecast'},
  {engine_id:'CAPA-001',name:'Capacity Engine',mode:'capacity'},
  {engine_id:'OPP-001',name:'Opportunity Engine',mode:'opportunity'},
  {engine_id:'INN-001',name:'Innovation Engine',mode:'innovation',wrapped_existing_paths:PARTIAL_PATHS['INN-001']},
  {engine_id:'LAB-TRD',name:'Laboratorio Trading',mode:'trading_isolation'},
  {engine_id:'LAB-SEO',name:'SEO Lab',mode:'lab'},
  {engine_id:'LAB-MKT',name:'Marketing Lab',mode:'lab',wrapped_existing_paths:PARTIAL_PATHS['LAB-MKT']},
  {engine_id:'LAB-AI',name:'AI Lab',mode:'lab'},
  {engine_id:'LAB-AUT',name:'Automation Lab',mode:'lab'},
  {engine_id:'MKT-002',name:'Market Intelligence Engine',mode:'market'},
  {engine_id:'EXPAND-001',name:'Expansion Engine',mode:'expansion',wrapped_existing_paths:PARTIAL_PATHS['EXPAND-001']},
  {engine_id:'FRAN-001',name:'Franchise / Replication Engine',mode:'replication'},
  {engine_id:'VENT-001',name:'New Venture Engine',mode:'venture'}
].map(x=>Object.freeze({...x,wrapped_existing_paths:Object.freeze([...(x.wrapped_existing_paths||[])])})));
const BY_ID=new Map(ENGINE_DEFINITIONS.map(x=>[x.engine_id,x]));

function context(engineId,input={}){
  const company_id=String(input.company_id||'').trim();
  const environment=String(input.environment||'').trim().toUpperCase();
  const version=String(input.version||'0.1.0-foundation').trim();
  const principal_company_id=String(input.principal_company_id||company_id).trim();
  if(!company_id) throw new Error(`${engineId}: company_id required`);
  if(!ALLOWED_ENVIRONMENTS.has(environment)) throw new Error(`${engineId}: environment must be LAB or PREPROD`);
  if(principal_company_id!==company_id) throw new Error(`${engineId}: CROSS_COMPANY_DENIED`);
  return Object.freeze({company_id,engine_id:engineId,environment,version,project_id:input.project_id??null,identity_id:input.identity_id??null,account_id:input.account_id??null});
}
function humanRequired(code,reason,ctx){if(!HUMAN_CODES.has(code))throw new Error(`Unsupported HUMAN_REQUIRED code: ${code}`);return {status:'HUMAN_REQUIRED',human_required:true,human_required_code:code,reason,context:ctx};}
const nums=a=>(Array.isArray(a)?a:[]).map(Number).filter(Number.isFinite);
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(n)?n:0));
export function foundationManifest(engineId){const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L7 foundation engine ${engineId}`);return Object.freeze({engine_id:d.engine_id,name:d.name,layer:'L7',version:'0.1.0-foundation',environment:'LAB_PREPROD_ONLY',company_scope:'REQUIRED_DENY_CROSS_COMPANY',wrapped_existing_paths:[...d.wrapped_existing_paths],network_execution:false,external_actions:false,prod_writes:false,trading_access:false,secret_values:false,additional_cost_eur:0,promotion_authorized:false});}
export function executeFoundation(engineId,input={}){
  const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L7 foundation engine ${engineId}`);const ctx=context(engineId,input);
  if(input.security_incident===true)return humanRequired('SECURITY_INCIDENT','Security incident requires human handling',ctx);
  if(input.high_risk===true)return humanRequired('HIGH_RISK','High-risk decision cannot be autonomously executed',ctx);
  if(input.low_confidence===true)return humanRequired('LOW_CONFIDENCE','Low-confidence result requires review',ctx);
  if(Number(input.requested_spend_eur||0)>Number(input.preauthorized_spend_eur||0))return humanRequired('MONEY_LIMIT','Requested spend exceeds preauthorized zero-cost/approved limit',ctx);
  switch(d.mode){
    case 'strategy':{const items=Array.isArray(input.options)?input.options:[];const ranked=items.map((x,i)=>({id:x.id??`option-${i+1}`,score:clamp(Number(x.value||0)*2-Number(x.risk||0)-Number(x.effort||0))})).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)));return {status:'FOUNDATION_OK',context:ctx,ranked,recommendation:ranked[0]?.id??null,autonomous_commit:false};}
    case 'forecast':{const s=nums(input.series);return {status:'FOUNDATION_OK',context:ctx,method:'SIMPLE_MEAN_BASELINE',forecast:s.length?avg(s):null,sample_size:s.length,ml_used:false};}
    case 'capacity':{const demand=Math.max(0,Number(input.demand||0)),capacity=Math.max(0,Number(input.capacity||0));return {status:'FOUNDATION_OK',context:ctx,demand,capacity,gap:Math.max(0,demand-capacity),utilization_pct:capacity?Math.round((demand/capacity)*10000)/100:null};}
    case 'opportunity':{const benefit=Number(input.expected_benefit_eur||0),cost=Number(input.cost_eur||0),risk=clamp(Number(input.risk_score||0));return {status:'FOUNDATION_OK',context:ctx,roi_ratio:cost>0?(benefit-cost)/cost:(benefit>0?Infinity:0),risk_score:risk,next_action:risk>=70?'REVIEW':'MVP_CANDIDATE',autonomous_spend:false};}
    case 'innovation':{const hs=Array.isArray(input.hypotheses)?input.hypotheses:[];const ranked=hs.map((x,i)=>({id:x.id??`hypothesis-${i+1}`,score:clamp(Number(x.impact||0)+Number(x.confidence||0)-Number(x.effort||0))})).sort((a,b)=>b.score-a.score||String(a.id).localeCompare(String(b.id)));return {status:'FOUNDATION_OK',context:ctx,ranked,wrapped_existing_paths:[...d.wrapped_existing_paths],autonomous_prod_change:false};}
    case 'trading_isolation':return {status:'ISOLATED_LAB_FOUNDATION',context:ctx,lab:'TRADING',trading_execution:false,credential_access:false,shared_prod_resources:false,network_execution:false,promotion_authorized:false};
    case 'lab':return {status:'FOUNDATION_OK',context:ctx,lab_engine:engineId,hypothesis:String(input.hypothesis||''),metric:String(input.metric||''),sandbox_only:true,prod_promotion:false,wrapped_existing_paths:[...d.wrapped_existing_paths]};
    case 'market':{const s=nums(input.signal_scores);return {status:'FOUNDATION_OK',context:ctx,signal_count:s.length,market_signal_index:Math.round(avg(s)*100)/100,external_research_executed:false};}
    case 'expansion':{const checks=Array.isArray(input.checks)?input.checks:[];const passed=checks.filter(Boolean).length;return {status:'FOUNDATION_OK',context:ctx,readiness_pct:checks.length?Math.round((passed/checks.length)*100):0,passed,total:checks.length,wrapped_existing_paths:[...d.wrapped_existing_paths],deployment_authorized:false};}
    case 'replication':{const required=['processes','brand','legal','training','unit_economics'];const ready=required.filter(k=>input[k]===true);return {status:'FOUNDATION_OK',context:ctx,ready:ready.length===required.length,ready_checks:ready,missing_checks:required.filter(k=>!ready.includes(k)),autonomous_franchise_commit:false};}
    case 'venture':{const score=clamp(Number(input.demand||0)+Number(input.margin||0)+Number(input.fit||0)-Number(input.risk||0));return {status:'FOUNDATION_OK',context:ctx,venture_score:score,next_action:score>=60?'EXPERIMENT':'HOLD',autonomous_company_creation:false};}
    default:throw new Error(`Unsupported L7 mode ${d.mode}`);
  }
}
