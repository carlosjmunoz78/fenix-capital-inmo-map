import { createHash } from 'node:crypto';

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_REQUIRED_SET = new Set(HUMAN_REQUIRED_REASONS);
const POLICY_EFFECTS = new Set(['ALLOW','DENY','REVIEW']);
const PRIORITY_BY_REASON = Object.freeze({SECURITY_INCIDENT:100,LEGAL_REQUIRED:90,SIGNATURE_REQUIRED:85,HIGH_RISK:80,MONEY_LIMIT:70,POLICY_CONFLICT:60,CUSTOMER_HUMAN_REQUEST:50,LOW_CONFIDENCE:40});
const ROLE_BY_REASON = Object.freeze({SECURITY_INCIDENT:'SECURITY',LEGAL_REQUIRED:'LEGAL',SIGNATURE_REQUIRED:'LEGAL',HIGH_RISK:'OPERATIONS',MONEY_LIMIT:'FINANCE',POLICY_CONFLICT:'GOVERNANCE',CUSTOMER_HUMAN_REQUEST:'CUSTOMER_SERVICE',LOW_CONFIDENCE:'OPERATIONS'});
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);

function nonEmpty(v,n){if(typeof v!=='string'||v.trim()==='')throw new TypeError(`${n} must be a non-empty string`);return v;}
function preprod(v){if(v!=='PREPROD')throw new Error('POL/HEX V0 accepts exact PREPROD only');}
function safeInt(v,n,min=0,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(v)||v<min||v>max)throw new TypeError(`${n} must be a safe integer in range`);return v;}
function companyAccess(requester,target){const r=nonEmpty(requester,'requester_company_id'),t=nonEmpty(target,'company_id');if(r!==t)throw new Error('cross-company access denied');return t;}
function clonePlain(v,p='$'){
  if(v===null||['string','boolean'].includes(typeof v))return v;
  if(typeof v==='number'){if(!Number.isFinite(v))throw new TypeError(`${p} contains non-finite number`);return v;}
  if(Array.isArray(v)){
    const descriptors=Object.getOwnPropertyDescriptors(v),length=descriptors.length?.value;
    if(!Number.isSafeInteger(length)||length<0)throw new TypeError(`${p} has invalid array length`);
    const out=new Array(length);
    for(const key of Reflect.ownKeys(descriptors)){
      if(key==='length')continue;
      if(typeof key!=='string'||!/^(0|[1-9]\d*)$/.test(key))throw new TypeError(`${p} arrays may contain indexed plain data only`);
      const d=descriptors[key];
      if('get'in d||'set'in d)throw new TypeError(`${p}[${key}] accessor properties are forbidden`);
      const index=Number(key);
      if(index>=length)throw new TypeError(`${p}[${key}] exceeds array length`);
      Object.defineProperty(out,key,{value:clonePlain(d.value,`${p}[${key}]`),enumerable:true,writable:true,configurable:true});
    }
    return out;
  }
  if(typeof v!=='object'||Object.getPrototypeOf(v)!==Object.prototype)throw new TypeError(`${p} must contain plain data only`);
  const out={};
  for(const key of Reflect.ownKeys(Object.getOwnPropertyDescriptors(v))){
    if(typeof key!=='string')throw new TypeError(`${p} symbol properties are forbidden`);
    const d=Object.getOwnPropertyDescriptor(v,key);
    if('get'in d||'set'in d)throw new TypeError(`${p}.${key} accessor properties are forbidden`);
    Object.defineProperty(out,key,{value:clonePlain(d.value,`${p}.${key}`),enumerable:true,writable:true,configurable:true});
  }
  return out;
}
function deepFreeze(v){if(!v||typeof v!=='object'||Object.isFrozen(v))return v;Object.freeze(v);for(const x of Object.values(v))deepFreeze(x);return v;}
function contextOf(input){const c=clonePlain(input,'$context');if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context is required');const x={company_id:nonEmpty(c.company_id,'company_id'),engine_id:nonEmpty(c.engine_id,'engine_id'),environment:nonEmpty(c.environment,'environment'),version:nonEmpty(c.version,'version')};preprod(x.environment);return deepFreeze(x);}
function booleanField(s,key){if(!own(s,key))return false;if(typeof s[key]!=='boolean')throw new TypeError(`${key} must be boolean when provided`);return s[key];}
function enabledField(s){if(!own(s,'enabled'))return true;if(typeof s.enabled!=='boolean')throw new TypeError('rule.enabled must be boolean when provided');return s.enabled;}
function ruleOf(rule){
  const s=clonePlain(rule,'$rule');
  if(!s||typeof s!=='object'||Array.isArray(s))throw new TypeError('rule must be a plain object');
  const r={
    rule_id:nonEmpty(s.rule_id,'rule_id'),
    version:nonEmpty(s.version,'rule.version'),
    environment:own(s,'environment')?s.environment:'PREPROD',
    company_id:own(s,'company_id')?s.company_id:'*',
    engine_id:own(s,'engine_id')?s.engine_id:'*',
    action:own(s,'action')?s.action:'*',
    effect:s.effect,
    priority:own(s,'priority')?s.priority:0,
    min_confidence_bp:own(s,'min_confidence_bp')?s.min_confidence_bp:0,
    max_amount_eur_cents:own(s,'max_amount_eur_cents')?s.max_amount_eur_cents:null,
    enabled:enabledField(s)
  };
  preprod(r.environment);nonEmpty(r.company_id,'rule.company_id');nonEmpty(r.engine_id,'rule.engine_id');nonEmpty(r.action,'rule.action');
  if(!POLICY_EFFECTS.has(r.effect))throw new TypeError('rule.effect must be ALLOW, DENY or REVIEW');
  safeInt(r.priority,'rule.priority',0,1_000_000);safeInt(r.min_confidence_bp,'rule.min_confidence_bp',0,10_000);
  if(own(s,'max_amount_eur_cents'))safeInt(r.max_amount_eur_cents,'rule.max_amount_eur_cents');
  return deepFreeze(r);
}
function requestOf(req){const s=clonePlain(req,'$request');const hasConfidence=own(s,'confidence_bp'),hasAmount=own(s,'amount_eur_cents'),hasSource=own(s,'source');const r={action:nonEmpty(s.action,'action'),confidence_bp:hasConfidence?s.confidence_bp:null,amount_eur_cents:hasAmount?s.amount_eur_cents:null,legal_required:booleanField(s,'legal_required'),signature_required:booleanField(s,'signature_required'),high_risk:booleanField(s,'high_risk'),security_incident:booleanField(s,'security_incident'),customer_human_request:booleanField(s,'customer_human_request'),source:hasSource?s.source:'UNSPECIFIED'};if(r.confidence_bp!==null)safeInt(r.confidence_bp,'confidence_bp',0,10_000);if(r.amount_eur_cents!==null)safeInt(r.amount_eur_cents,'amount_eur_cents');nonEmpty(r.source,'source');return deepFreeze(r);}
function human(reason,context,request,policy=null){if(!HUMAN_REQUIRED_SET.has(reason))throw new Error('non-canonical HUMAN_REQUIRED reason');return deepFreeze({status:'HUMAN_REQUIRED',reason,context,action:request.action,policy});}
function match(rule,ctx,req){return rule.enabled&&rule.environment===ctx.environment&&(rule.company_id==='*'||rule.company_id===ctx.company_id)&&(rule.engine_id==='*'||rule.engine_id===ctx.engine_id)&&(rule.action==='*'||rule.action===req.action);}
function specificity(rule){return Number(rule.company_id!=='*')+Number(rule.engine_id!=='*')+Number(rule.action!=='*');}

export class PolicyEngine{
  #rules;#environment;#version;#audit=[];
  constructor(options={}){
    const opts=clonePlain(options,'$options');
    if(!opts||typeof opts!=='object'||Array.isArray(opts))throw new TypeError('options must be a plain object');
    const environment=own(opts,'environment')?opts.environment:'PREPROD',version=own(opts,'version')?opts.version:'0.1.0',rawRules=own(opts,'rules')?opts.rules:[];
    preprod(environment);this.#environment=environment;this.#version=nonEmpty(version,'version');
    const safeRules=clonePlain(rawRules,'$rules');if(!Array.isArray(safeRules))throw new TypeError('rules must be an array');
    const rs=Array.prototype.map.call(safeRules,ruleOf),ids=new Set();for(const r of rs){const k=`${r.rule_id}@${r.version}`;if(ids.has(k))throw new Error(`duplicate policy rule version: ${k}`);ids.add(k);}this.#rules=Object.freeze(rs);
  }
  get environment(){return this.#environment;} get version(){return this.#version;}
  evaluate(contextInput,requestInput){const ctx=contextOf(contextInput);if(ctx.environment!==this.#environment)throw new Error('context environment does not match policy engine');const req=requestOf(requestInput);let result;
    if(req.security_incident)result=human('SECURITY_INCIDENT',ctx,req);else if(req.legal_required)result=human('LEGAL_REQUIRED',ctx,req);else if(req.signature_required)result=human('SIGNATURE_REQUIRED',ctx,req);else if(req.customer_human_request)result=human('CUSTOMER_HUMAN_REQUEST',ctx,req);else if(req.high_risk)result=human('HIGH_RISK',ctx,req);else{const ms=this.#rules.filter(r=>match(r,ctx,req));if(!ms.length)result=deepFreeze({status:'DENY',reason:'NO_MATCHING_POLICY',context:ctx,action:req.action,policy:null});else{const maxS=Math.max(...ms.map(specificity)),specific=ms.filter(r=>specificity(r)===maxS),maxP=Math.max(...specific.map(r=>r.priority)),top=specific.filter(r=>r.priority===maxP);if(top.length!==1)result=human('POLICY_CONFLICT',ctx,req,top.map(r=>`${r.rule_id}@${r.version}`).sort());else{const selected=top[0],policy=`${selected.rule_id}@${selected.version}`;if(selected.min_confidence_bp>0&&req.confidence_bp===null)result=human('LOW_CONFIDENCE',ctx,req,policy);else if(selected.max_amount_eur_cents!==null&&req.amount_eur_cents===null)result=human('LOW_CONFIDENCE',ctx,req,policy);else if(req.confidence_bp!==null&&req.confidence_bp<selected.min_confidence_bp)result=human('LOW_CONFIDENCE',ctx,req,policy);else if(selected.max_amount_eur_cents!==null&&req.amount_eur_cents>selected.max_amount_eur_cents)result=human('MONEY_LIMIT',ctx,req,policy);else if(selected.effect==='REVIEW')result=human('POLICY_CONFLICT',ctx,req,policy);else result=deepFreeze({status:selected.effect,reason:`POLICY_${selected.effect}`,context:ctx,action:req.action,policy});}}}
    this.#audit.push(deepFreeze({type:'POLICY_EVALUATED',context:ctx,action:req.action,status:result.status,reason:result.reason,policy:result.policy??null}));return clonePlain(result);}
  auditLog(options={}){const opts=clonePlain(options,'$audit');if(!opts||typeof opts!=='object'||Array.isArray(opts))throw new TypeError('audit options must be a plain object');const requester=opts.requester_company_id,company=companyAccess(requester,own(opts,'company_id')?opts.company_id:requester);return this.#audit.filter(e=>e.context.company_id===company).map(clonePlain);}
}

function exceptionKey(ctx,action,reason,policy){return createHash('sha256').update(JSON.stringify([ctx.company_id,ctx.engine_id,ctx.environment,ctx.version,action,reason,policy??null])).digest('hex');}
export class HumanExceptionEngine{
  #environment;#version;#exceptions=new Map();
  constructor(options={}){const opts=clonePlain(options,'$options');if(!opts||typeof opts!=='object'||Array.isArray(opts))throw new TypeError('options must be a plain object');const environment=own(opts,'environment')?opts.environment:'PREPROD',version=own(opts,'version')?opts.version:'0.1.0';preprod(environment);this.#environment=environment;this.#version=nonEmpty(version,'version');}
  get environment(){return this.#environment;} get version(){return this.#version;}
  ingest(resultInput,options={}){const opts=clonePlain(options,'$ingest');if(!opts||typeof opts!=='object'||Array.isArray(opts))throw new TypeError('ingest options must be a plain object');const result=clonePlain(resultInput,'$result');if(result?.status!=='HUMAN_REQUIRED'||!HUMAN_REQUIRED_SET.has(result.reason))throw new TypeError('HEX-001 accepts canonical HUMAN_REQUIRED results only');const ctx=contextOf(result.context);companyAccess(opts.requester_company_id,ctx.company_id);if(ctx.environment!==this.#environment)throw new Error('context environment does not match exception engine');const action=nonEmpty(result.action,'action'),key=exceptionKey(ctx,action,result.reason,result.policy),existing=this.#exceptions.get(key);if(existing)return clonePlain(existing);const item=deepFreeze({exception_id:key,status:'OPEN',reason:result.reason,priority:PRIORITY_BY_REASON[result.reason],assigned_role:ROLE_BY_REASON[result.reason],context:ctx,action,policy:own(result,'policy')?result.policy:null});this.#exceptions.set(key,item);return clonePlain(item);}
  list(options={}){const opts=clonePlain(options,'$list');if(!opts||typeof opts!=='object'||Array.isArray(opts))throw new TypeError('list options must be a plain object');const requester=opts.requester_company_id,company=companyAccess(requester,own(opts,'company_id')?opts.company_id:requester);return [...this.#exceptions.values()].filter(x=>x.context.company_id===company).sort((a,b)=>b.priority-a.priority||a.exception_id.localeCompare(b.exception_id)).map(clonePlain);}
}

export const GOVERNANCE_V0_CONTRACT=deepFreeze({environment:'PREPROD',additional_cost_target_eur:0,prod_execution_enabled:false,autonomous_prod:false,supabase_writes:false,external_actions:false,cross_company_access:'DENY',policy_effects:['ALLOW','DENY','REVIEW'],human_required_reasons:[...HUMAN_REQUIRED_REASONS]});
