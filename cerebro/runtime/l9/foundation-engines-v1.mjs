const ALLOWED_ENVIRONMENTS=new Set(['LAB','PREPROD']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const WHY_WRAPPED_PATHS=Object.freeze(['cerebro/runtime/cerebro-fast-evolution-planner-v1.mjs']);
export const ENGINE_DEFINITIONS=Object.freeze([
  Object.freeze({engine_id:'DIRUI-001',name:'Directives UI',mode:'directives',wrapped_existing_paths:Object.freeze([])}),
  Object.freeze({engine_id:'TIMELINE-001',name:'Timeline / Audit UI',mode:'timeline',wrapped_existing_paths:Object.freeze([])}),
  Object.freeze({engine_id:'WHY-001',name:'Why / Explainability UI',mode:'why',wrapped_existing_paths:WHY_WRAPPED_PATHS}),
  Object.freeze({engine_id:'VOICEUI-001',name:'Voice UI',mode:'voice_ui',wrapped_existing_paths:Object.freeze([])})
]);
const BY_ID=new Map(ENGINE_DEFINITIONS.map(x=>[x.engine_id,x]));
function context(engineId,input={}){
  const company_id=String(input.company_id||'').trim();
  const principal_company_id=String(input.principal_company_id||company_id).trim();
  const environment=String(input.environment||'').trim().toUpperCase();
  const version=String(input.version||'0.1.0-foundation').trim();
  if(!company_id)throw new Error(`${engineId}: company_id required`);
  if(principal_company_id!==company_id)throw new Error(`${engineId}: CROSS_COMPANY_DENIED`);
  if(!ALLOWED_ENVIRONMENTS.has(environment))throw new Error(`${engineId}: environment must be LAB or PREPROD`);
  return Object.freeze({company_id,engine_id:engineId,environment,version,project_id:input.project_id??null,identity_id:input.identity_id??null,account_id:input.account_id??null});
}
function human(code,reason,ctx){if(!HUMAN_CODES.has(code))throw new Error(`Unsupported HUMAN_REQUIRED code: ${code}`);return {status:'HUMAN_REQUIRED',human_required:true,human_required_code:code,reason,context:ctx};}
const text=v=>String(v??'').trim();
export function foundationManifest(engineId){const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L9 foundation engine ${engineId}`);return Object.freeze({engine_id:d.engine_id,name:d.name,layer:'L9',version:'0.1.0-foundation',environment:'LAB_PREPROD_ONLY',company_scope:'REQUIRED_DENY_CROSS_COMPANY',wrapped_existing_paths:[...d.wrapped_existing_paths],ui_foundation:true,network_execution:false,external_actions:false,prod_writes:false,destructive_actions:false,microphone_capture:false,recording:false,paid_ai_required:false,secret_values:false,additional_cost_eur:0,promotion_authorized:false});}
export function executeFoundation(engineId,input={}){
  const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L9 foundation engine ${engineId}`);const ctx=context(engineId,input);
  if(input.security_incident===true)return human('SECURITY_INCIDENT','Security incident requires human handling',ctx);
  if(input.low_confidence===true)return human('LOW_CONFIDENCE','Low-confidence interaction requires review',ctx);
  if(input.customer_human_request===true)return human('CUSTOMER_HUMAN_REQUEST','User explicitly requested a human',ctx);
  if(input.policy_conflict===true)return human('POLICY_CONFLICT','UI action conflicts with policy',ctx);
  switch(d.mode){
    case 'directives':{
      const directives=(Array.isArray(input.directives)?input.directives:[]).map((x,i)=>({id:text(x.id)||`directive-${i+1}`,label:text(x.label),state:['READY','BLOCKED','DONE'].includes(String(x.state||'').toUpperCase())?String(x.state).toUpperCase():'READY',actionable:x.actionable===true}));
      return {status:'FOUNDATION_OK',context:ctx,directives,render_only:true,command_execution:false,external_write:false};
    }
    case 'timeline':{
      const events=(Array.isArray(input.events)?input.events:[]).map((x,i)=>({id:text(x.id)||`event-${i+1}`,at:text(x.at),type:text(x.type)||'EVENT',summary:text(x.summary),sequence:Number.isFinite(Number(x.sequence))?Number(x.sequence):i})).sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id));
      return {status:'FOUNDATION_OK',context:ctx,events,audit_view:true,append_executed:false,source_mutation:false};
    }
    case 'why':{
      const reasons=(Array.isArray(input.reasons)?input.reasons:[]).map(text).filter(Boolean);
      const evidence=(Array.isArray(input.evidence)?input.evidence:[]).map(x=>({source:text(x.source),claim:text(x.claim)}));
      return {status:'FOUNDATION_OK',context:ctx,decision:text(input.decision),reasons,evidence,explanation_complete:reasons.length>0,wrapped_existing_paths:[...d.wrapped_existing_paths],inference_added:false,decision_changed:false};
    }
    case 'voice_ui':{
      const transcript=text(input.transcript);
      const commands=transcript?transcript.split(/\s+/).slice(0,64):[];
      return {status:'FOUNDATION_OK',context:ctx,transcript,token_count:commands.length,input_mode:'TEXT_SIMULATION_ONLY',microphone_capture:false,recording:false,voice_api_call:false,command_execution:false};
    }
    default:throw new Error(`Unsupported L9 mode ${d.mode}`);
  }
}
