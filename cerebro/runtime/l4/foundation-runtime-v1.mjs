const ALLOWED_ENVIRONMENTS=new Set(['LAB','PREPROD']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function context(engine_id,input={}){
  const company_id=String(input.company_id||'').trim();
  const principal_company_id=String(input.principal_company_id||company_id).trim();
  const environment=String(input.environment||'').trim().toUpperCase();
  if(!company_id) throw new Error(`${engine_id}: company_id required`);
  if(principal_company_id!==company_id) throw new Error(`${engine_id}: CROSS_COMPANY_DENIED`);
  if(!ALLOWED_ENVIRONMENTS.has(environment)) throw new Error(`${engine_id}: environment must be LAB or PREPROD`);
  return Object.freeze({company_id,engine_id,environment,version:String(input.version||'0.1.0-foundation'),project_id:input.project_id??null,identity_id:input.identity_id??null,account_id:input.account_id??null});
}
function human(code,reason,ctx){if(!HUMAN_CODES.has(code))throw new Error(`invalid HUMAN_REQUIRED ${code}`);return {status:'HUMAN_REQUIRED',human_required:true,human_required_code:code,reason,context:ctx,external_execution:false,prod_write:false,cost_eur:0};}
function cents(v){if(typeof v==='number'&&Number.isInteger(v))return v;const s=String(v??'0').trim();if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))throw new Error('amount must be integer cents or decimal string');const neg=s.startsWith('-');const [a,b='']=s.replace('-','').split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return neg?-n:n;}
export function createFoundationEngine(profile){
  const manifest=Object.freeze({engine_id:profile.engine_id,name:profile.name,layer:'L4',version:'0.1.0-foundation',environment:'LAB_PREPROD_ONLY',company_scope:'REQUIRED_DENY_CROSS_COMPANY',preserve_existing:profile.preserve_existing===true,preserved_evidence_source:profile.preserve_existing?'L4 durable OLD baseline':null,domain_mode:profile.mode,network_execution:false,external_execution:false,prod_writes:false,trading_access:false,secret_values:false,additional_cost_eur:0,promotion_authorized:false});
  function run(input={}){
    const ctx=context(profile.engine_id,input);
    if(input.customer_human_request===true)return human('CUSTOMER_HUMAN_REQUEST','Explicit customer request for a human',ctx);
    if(input.security_incident===true)return human('SECURITY_INCIDENT','Security incident flag supplied by caller',ctx);
    if(profile.mode==='LEGAL_GATED'&&input.external_action===true)return human('LEGAL_REQUIRED','External legal/regulated action is outside foundation autonomy',ctx);
    if(profile.mode==='FINAL_FINANCIAL'&&input.request_final_recommendation===true)return human('HIGH_RISK','Final financial recommendation requires validated decision policy and human gate',ctx);
    if(profile.mode==='PAYMENT_RECONCILIATION'&&input.execute_payment===true)return human('HIGH_RISK','Payment execution is outside foundation autonomy',ctx);
    if(profile.mode==='RISK_SIGNALS'&&Array.isArray(input.signals)&&input.signals.some(x=>String(x?.severity||'').toUpperCase()==='HIGH'))return human('HIGH_RISK','High-risk signal supplied to foundation runtime',ctx);
    let result={mode:profile.mode};
    if(profile.mode==='DOCUMENT_PENDING'){
      const required=[...new Set((input.required_documents||[]).map(String))].sort();const available=new Set((input.available_documents||[]).map(String));result={required,pending:required.filter(x=>!available.has(x)),complete:required.every(x=>available.has(x))};
    } else if(profile.mode==='STRUCTURAL_QUALITY'){
      const required=[...new Set((input.required_fields||[]).map(String))].sort();const record=input.record&&typeof input.record==='object'?input.record:{};result={required_fields:required,missing_fields:required.filter(k=>record[k]===undefined||record[k]===null||record[k]===''),structural_only:true};
    } else if(profile.mode==='COHERENCE'){
      const checks=Array.isArray(input.checks)?input.checks:[];result={checks:checks.map(c=>({key:String(c?.key||''),consistent:c?.left===c?.right})),decision:'NO_DOMAIN_INFERENCE'};
    } else if(profile.mode==='PAYMENT_RECONCILIATION'){
      const items=Array.isArray(input.items)?input.items:[];const total_cents=items.reduce((a,x)=>a+cents(x?.amount_cents??x?.amount??0),0);result={total_cents,item_count:items.length,execution:false};
    } else if(profile.mode==='SLA'){
      const now=Number(input.now_ms);const due=Number(input.due_ms);result={now_ms:now,due_ms:due,state:Number.isFinite(now)&&Number.isFinite(due)?(now>due?'BREACHED':now===due?'DUE':'WITHIN'):'UNASSESSED',thresholds:'CALLER_SUPPLIED_ONLY'};
    } else if(profile.mode==='AGENDA'){
      const items=(Array.isArray(input.items)?input.items:[]).map(x=>({...x,at_ms:Number(x?.at_ms)})).sort((a,b)=>a.at_ms-b.at_ms);result={items,execution:false};
    } else if(profile.mode==='NBA'){
      const actions=(Array.isArray(input.allowed_actions)?input.allowed_actions:[]).filter(x=>x&&x.allowed!==false).map(x=>({id:String(x.id||''),priority:Number(x.priority||0)})).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));result={candidate:actions[0]??null,advisory_only:true};
    } else if(profile.mode==='BLOCKER'){
      result={blockers:(Array.isArray(input.blockers)?input.blockers:[]).map(x=>({code:String(x?.code||''),resolved:x?.resolved===true})),action:'REPORT_ONLY'};
    } else if(profile.mode==='THIRD_PARTY'){
      result={tasks:(Array.isArray(input.parties)?input.parties:[]).map((x,i)=>({sequence:i+1,party_ref:String(x?.party_ref||''),action:String(x?.action||'FOLLOW_UP'),delivery:'NOT_SENT'})),external_execution:false};
    } else if(profile.mode==='RISK_SIGNALS'){
      result={signals:Array.isArray(input.signals)?input.signals:[],assessment:'INPUT_SIGNAL_SUMMARY_ONLY',no_fraud_or_legal_conclusion:true};
    } else {
      result={advisory_only:true,input_keys:Object.keys(input).filter(k=>!['company_id','principal_company_id','environment','version'].includes(k)).sort(),domain_decision:false};
    }
    return {status:'FOUNDATION_OK',context:ctx,result,external_execution:false,network_execution:false,prod_write:false,cost_eur:0};
  }
  return Object.freeze({manifest,run});
}
