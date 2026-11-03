import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENGINE_ID='COMP-ONB-001';
const ENV='PREPROD';
export const ONBOARDING_STATES=Object.freeze(['NEW_COMPANY','REGISTERED','DISCOVERING','BUILDING','VALIDATING','ACTIVE','HUMAN_REQUIRED','FAILED']);
export const PHASE_REQUIREMENTS=Object.freeze({
  REGISTERED:Object.freeze(['COMP-REG-001','TENANT-001']),
  DISCOVERING:Object.freeze(['SCAN-001']),
  BUILDING:Object.freeze(['KW-001','WAUD-001','SOCAUD-001','LOCALP-001','KBOOT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001']),
  VALIDATING:Object.freeze(['ENGACT-001']),
  ACTIVE:Object.freeze([])
});
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const FLOW=['NEW_COMPANY','REGISTERED','DISCOVERING','BUILDING','VALIDATING','ACTIVE'];
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const text=(v,l,max=240)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);const s=v.trim();if(s.length>max)throw new Error(`${l} too long`);return s};
const company=v=>text(v,'company_id',64).toLowerCase();
const safe=x=>Object.freeze({...x,engine_id:ENGINE_ID,environment:ENV,version:'1.0.0',prod_execution_authorized:false,prod_write_authorized:false,supabase_prod_write_authorized:false,publish_authorized:false,deploy_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});
function assertEvidence(e,company_id){if(!e||typeof e!=='object')throw new Error('evidence object required');if(company(e.company_id)!==company_id)throw new Error('POLICY_CONFLICT:CROSS_COMPANY_EVIDENCE');const id=text(e.engine_id,'evidence.engine_id',80);if(e.environment!==ENV)throw new Error('POLICY_CONFLICT:EVIDENCE_ENVIRONMENT');if(e.prod_authorized===true||e.prod_execution_authorized===true||e.prod_write_authorized===true||e.supabase_prod_write_authorized===true||e.publish_authorized===true||e.deploy_authorized===true||e.crm_write_authorized===true||e.spend_authorized===true||e.trading_access===true||Number(e.additional_cost_eur||0)!==0)throw new Error('POLICY_CONFLICT:EVIDENCE_AUTHORITY');const hr=e.human_required_code??e.human_required??null;if(hr!==null&&!HUMAN_REQUIRED.has(hr))throw new Error('invalid HUMAN_REQUIRED');return {id,human_required:hr,ref:e.evidence_sha256||e.result_sha256||sha(e)}}
export function createOnboardingRun({company_id,run_id,evidence_at}){const c=company(company_id),r=text(run_id,'run_id',120),at=text(evidence_at,'evidence_at',80);const base={state:'NEW_COMPANY',company_id:c,run_id:r,evidence_at:at,completed_engines:[],phase_attempts:{},blockers:[],human_required:null};return safe({...base,state_sha256:sha(base)})}
export function advanceOnboarding(run,{evidence=[]}={}){if(!run||run.engine_id!==ENGINE_ID||run.environment!==ENV)throw new Error('invalid onboarding run');if(['ACTIVE','HUMAN_REQUIRED','FAILED'].includes(run.state))return run;const c=company(run.company_id),seen=new Map((run.completed_engines||[]).map(x=>[x.engine_id,x]));for(const raw of evidence){const e=assertEvidence(raw,c);if(e.human_required){const base={...run,state:'HUMAN_REQUIRED',human_required:e.human_required,blockers:[`UPSTREAM_${e.id}`],completed_engines:[...seen.values()].sort((a,b)=>a.engine_id.localeCompare(b.engine_id))};return safe({...base,state_sha256:sha(base)})}seen.set(e.id,{engine_id:e.id,evidence_ref:e.ref})}
  let state=run.state;const attempts={...(run.phase_attempts||{})};let blockers=[];while(state!=='ACTIVE'){const next=FLOW[FLOW.indexOf(state)+1];if(!next)break;const req=PHASE_REQUIREMENTS[next]||[];if(!(next in attempts))attempts[next]=1;const missing=req.filter(id=>!seen.has(id));if(missing.length){blockers=missing.map(id=>`MISSING_${id}`);break}state=next;if(state==='ACTIVE')break}
  const completed=[...seen.values()].sort((a,b)=>a.engine_id.localeCompare(b.engine_id));const base={...run,state,completed_engines:completed,phase_attempts:attempts,blockers,human_required:null};return safe({...base,state_sha256:sha(base)})}
export function retryOnboarding(run,input={}){return advanceOnboarding(run,input)}
export function persistOnboardingRun(run,file){if(!run||run.engine_id!==ENGINE_ID||run.environment!==ENV)throw new Error('invalid onboarding run');const target=path.resolve(text(file,'file',1200));fs.mkdirSync(path.dirname(target),{recursive:true});const current=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):null;if(current?.state_sha256===run.state_sha256)return safe({status:'IDEMPOTENT_EXISTING',company_id:run.company_id,run_id:run.run_id,state:run.state,file:target,state_sha256:run.state_sha256});const tmp=`${target}.tmp-${process.pid}`;fs.writeFileSync(tmp,JSON.stringify(run,null,2)+'\n',{encoding:'utf8',mode:0o600});fs.renameSync(tmp,target);return safe({status:'PERSISTED_PREPROD',company_id:run.company_id,run_id:run.run_id,state:run.state,file:target,state_sha256:run.state_sha256})}
export function loadOnboardingRun(file){const run=JSON.parse(fs.readFileSync(path.resolve(text(file,'file',1200)),'utf8'));if(run.engine_id!==ENGINE_ID||run.environment!==ENV)throw new Error('invalid persisted onboarding run');return run}
export const COMP_ONB_001_CONTRACT=Object.freeze({schema_version:'1.0.0',engine_id:ENGINE_ID,layer:'L8',environment:ENV,version:'1.0.0',command:'NEW_COMPANY',states:ONBOARDING_STATES,phase_requirements:PHASE_REQUIREMENTS,idempotent_retry:true,per_engine_advancement:true,local_preprod_persistence:true,downstream_execution:'EVIDENCE_GATED_ONLY',prod_execution_authorized:false,prod_write_authorized:false,supabase_prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0});
