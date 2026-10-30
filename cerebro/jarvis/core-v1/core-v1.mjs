import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const JARVIS_CORE_VERSION='1.0.0-preprod-candidate';
export const HUMAN_REQUIRED=Object.freeze(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
export const JARVIS_IDENTITY=Object.freeze({identity_id:'jarvis',identity_type:'CEREBRO_EXECUTIVE_IDENTITY',owner_root:'Carlos',owner_role:'OWNER_ROOT',constitution_ref:'cerebro/jarvis/boost-001/JARVIS_CONSTITUTION_V1.md',environment_policy:'PREPROD_FIRST'});

const CONF={PUBLIC:0,INTERNAL:1,CONFIDENTIAL:2,SECRET:3,HEALTH_PRIVATE:4,LEGAL_RESTRICTED:4};
const INTEGRITY={UNTRUSTED:0,TAINTED:1,OBSERVED:2,VERIFIED:3,AUTHORITATIVE:4};
const HIGH_RISK_ACTIONS=new Set(['prod_write','money_move','credential_export','legal_commit','security_policy_change','identity_change','external_publish']);
const nowIso=()=>new Date().toISOString();
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const required=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} required`);return v.trim();};

export function normalizeExecutionContext(value={}){
  const context=Object.freeze({
    request_id:required(value.request_id,'request_id'),
    company_id:required(value.company_id,'company_id'),
    project_id:required(value.project_id||'default','project_id'),
    engine_id:required(value.engine_id||'JARVIS-CORE','engine_id'),
    capability_id:required(value.capability_id||'jarvis-core','capability_id'),
    environment:required(value.environment||'PREPROD','environment'),
    version:required(value.version||JARVIS_CORE_VERSION,'version'),
    identity_id:required(value.identity_id||'jarvis','identity_id'),
    actor_role:required(value.actor_role||'OWNER_ROOT_DELEGATE','actor_role'),
    permissions:Object.freeze([...(value.permissions||[]).map(String)]),
    max_cost_eur:Number.isFinite(Number(value.max_cost_eur))?Number(value.max_cost_eur):0,
    cross_company_allowed:Boolean(value.cross_company_allowed),
  });
  if(context.environment==='PROD'&&!context.permissions.includes('prod:write')) throw new Error('PROD_WRITE_PERMISSION_REQUIRED');
  return context;
}

export function authorizeAction({context:rawContext,action,target_company_id=null,risk='LOW',confidence=1,money_eur=0,legal_required=false,signature_required=false,customer_human_request=false}={}){
  const context=normalizeExecutionContext(rawContext);
  const requested=required(action,'action');
  const targetCompany=target_company_id||context.company_id;
  if(targetCompany!==context.company_id&&!context.cross_company_allowed) return Object.freeze({allowed:false,human_required:'POLICY_CONFLICT',reason:'CROSS_COMPANY_DENY_BY_DEFAULT'});
  if(customer_human_request) return Object.freeze({allowed:false,human_required:'CUSTOMER_HUMAN_REQUEST',reason:'CUSTOMER_REQUESTED_HUMAN'});
  if(legal_required) return Object.freeze({allowed:false,human_required:'LEGAL_REQUIRED',reason:'LEGAL_HUMAN_REQUIRED'});
  if(signature_required) return Object.freeze({allowed:false,human_required:'SIGNATURE_REQUIRED',reason:'SIGNATURE_HUMAN_REQUIRED'});
  if(confidence<0.7) return Object.freeze({allowed:false,human_required:'LOW_CONFIDENCE',reason:'CONFIDENCE_BELOW_0_7'});
  if(String(risk).toUpperCase()==='HIGH'&&!context.permissions.includes('risk:high')) return Object.freeze({allowed:false,human_required:'HIGH_RISK',reason:'HIGH_RISK_PERMISSION_REQUIRED'});
  if(money_eur>context.max_cost_eur) return Object.freeze({allowed:false,human_required:'MONEY_LIMIT',reason:'MONEY_LIMIT_EXCEEDED'});
  if(context.environment==='PROD'&&!context.permissions.includes('prod:write')) return Object.freeze({allowed:false,human_required:'POLICY_CONFLICT',reason:'PROD_WRITE_DENIED'});
  return Object.freeze({allowed:true,human_required:null,reason:'AUTHORIZED',action:requested});
}

export function classifyInformation({confidentiality='INTERNAL',integrity='OBSERVED',company_id,project_id='default',purpose='mission',source='unknown'}={}){
  if(!(confidentiality in CONF)) throw new Error(`UNKNOWN_CONFIDENTIALITY:${confidentiality}`);
  if(!(integrity in INTEGRITY)) throw new Error(`UNKNOWN_INTEGRITY:${integrity}`);
  return Object.freeze({confidentiality,integrity,company_id:required(company_id,'company_id'),project_id:required(project_id,'project_id'),purpose:required(purpose,'purpose'),source:String(source),tainted:INTEGRITY[integrity]<=INTEGRITY.TAINTED});
}

export function propagateInformationLabels(...labels){
  if(!labels.length) throw new Error('LABELS_REQUIRED');
  const xs=labels.filter(Boolean);
  const conf=Object.keys(CONF).sort((a,b)=>CONF[b]-CONF[a]).find(k=>xs.some(x=>x.confidentiality===k))||'INTERNAL';
  const integrity=Object.keys(INTEGRITY).sort((a,b)=>INTEGRITY[a]-INTEGRITY[b]).find(k=>xs.some(x=>x.integrity===k))||'UNTRUSTED';
  const companies=[...new Set(xs.map(x=>x.company_id))];
  const projects=[...new Set(xs.map(x=>x.project_id))];
  return Object.freeze({confidentiality:conf,integrity,company_id:companies.length===1?companies[0]:'MULTI',project_id:projects.length===1?projects[0]:'MULTI',tainted:INTEGRITY[integrity]<=INTEGRITY.TAINTED});
}

export function toolFirewall({context:rawContext,action,labels=[]}={}){
  const context=normalizeExecutionContext(rawContext);
  const merged=labels.length?propagateInformationLabels(...labels):null;
  if(merged?.company_id==='MULTI'&&!context.cross_company_allowed) return Object.freeze({allowed:false,reason:'CROSS_COMPANY_INFORMATION_FLOW_DENIED'});
  if(merged?.company_id&&merged.company_id!=='MULTI'&&merged.company_id!==context.company_id&&!context.cross_company_allowed) return Object.freeze({allowed:false,reason:'FOREIGN_COMPANY_INFORMATION_DENIED'});
  if(HIGH_RISK_ACTIONS.has(String(action))&&merged&&INTEGRITY[merged.integrity]<INTEGRITY.VERIFIED) return Object.freeze({allowed:false,reason:'UNVERIFIED_OR_TAINTED_INPUT_FOR_HIGH_RISK_ACTION'});
  return Object.freeze({allowed:true,reason:'IFC_ALLOW',labels:merged});
}

export function compileContext({context:rawContext,mission={},shards=[],max_items=24,allowed_confidentiality='SECRET'}={}){
  const context=normalizeExecutionContext(rawContext);
  const maxItems=Math.max(1,Math.min(128,Number(max_items)||24));
  const confLimit=CONF[allowed_confidentiality]??CONF.SECRET;
  const selected=[];
  for(const shard of shards){
    const label=shard.label||{};
    if(label.company_id&&label.company_id!==context.company_id&&!context.cross_company_allowed) continue;
    if((CONF[label.confidentiality||'INTERNAL']??CONF.SECRET)>confLimit) continue;
    if(shard.secret===true) continue;
    let score=0;
    if(shard.required) score+=100;
    if(label.company_id===context.company_id) score+=25;
    if(label.project_id===context.project_id) score+=20;
    if(Array.isArray(mission.tags)&&mission.tags.some(t=>String(shard.text||'').toLowerCase().includes(String(t).toLowerCase()))) score+=15;
    score+=Math.max(0,Math.min(10,Number(shard.confidence??0.5)*10));
    const ageHours=shard.observed_at?Math.max(0,(Date.now()-Date.parse(shard.observed_at))/3600000):9999;
    score+=Math.max(0,10-Math.log10(1+ageHours)*3);
    selected.push({...shard,_score:Math.round(score*1000)/1000});
  }
  selected.sort((a,b)=>b._score-a._score||String(a.id||'').localeCompare(String(b.id||'')));
  const items=selected.slice(0,maxItems).map(({_score,...rest})=>rest);
  return Object.freeze({schema_version:'1.0',context_id:`ctx-${hash([context.request_id,mission.mission_id||'',items.map(x=>x.id||x.text)]) .slice(0,20)}`,compiled_at:nowIso(),request_id:context.request_id,company_id:context.company_id,project_id:context.project_id,mission_id:mission.mission_id||null,item_count:items.length,items:Object.freeze(items)});
}

export class CapabilityFabricV1{
  #items=new Map();
  register(capability){const id=required(capability?.capability_id,'capability_id');if(this.#items.has(id)&&this.#items.get(id).version!==capability.version)throw new Error(`CAPABILITY_VERSION_CONFLICT:${id}`);this.#items.set(id,Object.freeze({...capability,capability_id:id}));return this.#items.get(id);}
  list(){return [...this.#items.values()];}
  resolve({capability_id,environment='PREPROD',company_id}){const c=this.#items.get(required(capability_id,'capability_id'));if(!c)return null;if(Array.isArray(c.environments)&&!c.environments.includes(environment))return null;if(Array.isArray(c.company_ids)&&company_id&&!c.company_ids.includes(company_id))return null;return c;}
}

export function verifyProofCarryingAction(proof={}){
  const requiredFields=['action_id','request_id','company_id','environment','intent','authority','result','evidence'];
  const missing=requiredFields.filter(k=>proof[k]===undefined||proof[k]===null||proof[k]==='');
  if(missing.length)return Object.freeze({ok:false,reason:'MISSING_FIELDS',missing});
  if(proof.environment==='PROD'&&proof.authority?.prod_write!==true)return Object.freeze({ok:false,reason:'PROD_AUTHORITY_NOT_PROVEN'});
  if(!Array.isArray(proof.evidence)||proof.evidence.length===0)return Object.freeze({ok:false,reason:'EVIDENCE_REQUIRED'});
  return Object.freeze({ok:true,reason:'VERIFIED',proof_hash:hash(proof)});
}

export class ExecutionJournalV1{
  #events=[];
  constructor({file=null}={}){this.file=file?path.resolve(file):null;if(this.file&&fs.existsSync(this.file)){const txt=fs.readFileSync(this.file,'utf8').trim();if(txt)this.#events=txt.split(/\r?\n/).map(JSON.parse);}}
  append(event){const previous=this.#events.at(-1)?.event_hash||'GENESIS';const normalized={schema_version:'1.0',sequence:this.#events.length+1,recorded_at:event.recorded_at||nowIso(),...event,previous_hash:previous};const event_hash=hash(normalized);const record=Object.freeze({...normalized,event_hash});this.#events.push(record);if(this.file){fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.appendFileSync(this.file,JSON.stringify(record)+'\n','utf8');}return record;}
  events(){return [...this.#events];}
  verify(){let prev='GENESIS';for(const event of this.#events){const {event_hash,...body}=event;if(body.previous_hash!==prev)return false;if(hash(body)!==event_hash)return false;prev=event_hash;}return true;}
  hasSideEffect(idempotency_key){return this.#events.some(e=>e.type==='SIDE_EFFECT_COMMITTED'&&e.idempotency_key===idempotency_key);}
}

export function createJarvisCore({capabilities=[]}={}){
  const fabric=new CapabilityFabricV1();for(const c of capabilities)fabric.register(c);
  return Object.freeze({identity:JARVIS_IDENTITY,version:JARVIS_CORE_VERSION,human_required:HUMAN_REQUIRED,normalizeExecutionContext,authorizeAction,classifyInformation,propagateInformationLabels,toolFirewall,compileContext,fabric,verifyProofCarryingAction,createJournal:opts=>new ExecutionJournalV1(opts)});
}
