import crypto from 'node:crypto';

const STATES=new Set(['CURRENT','SUPERSEDED','UNCERTAIN','VALIDATED']);
const ENV=new Set(['LAB','PREPROD']);
const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()};
const clone=v=>structuredClone(v);
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

function ctx(c){
  if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context required');
  const out={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};
  if(out.engine_id!=='KNW-001')throw new Error('engine_id must be KNW-001');
  if(!ENV.has(out.environment))throw new Error('KNW-001 V0 is LAB/PREPROD only');
  return Object.freeze(out);
}

function normalize(item,context){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('knowledge item required');
  const state=req(item.state,'state');
  if(!STATES.has(state))throw new Error('invalid knowledge state');
  const confidence=Number(item.confidence);
  if(!Number.isFinite(confidence)||confidence<0||confidence>1)throw new TypeError('confidence must be 0..1');
  const body={
    knowledge_id:req(item.knowledge_id,'knowledge_id'),
    company_id:context.company_id,
    scope:req(item.scope??'COMPANY','scope'),
    subject:req(item.subject,'subject'),
    content:req(item.content,'content'),
    state,
    confidence,
    source_ref:req(item.source_ref,'source_ref'),
    review_at:req(item.review_at,'review_at'),
    supersedes:item.supersedes?req(item.supersedes,'supersedes'):null,
    version:req(item.version??'1','item.version')
  };
  return Object.freeze({...body,evidence_hash:hash(body)});
}

export class KnowledgeEngineV0{
  #items=new Map();
  put({context,item}){
    const c=ctx(context); const n=normalize(item,c);
    const existing=this.#items.get(n.knowledge_id);
    if(existing&&existing.company_id!==c.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'cross_company_knowledge_id'});
    if(n.state==='VALIDATED'&&n.confidence<0.8)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',detail:'validated_requires_confidence_0.8'});
    if(n.supersedes){
      const prior=this.#items.get(n.supersedes);
      if(!prior||prior.company_id!==c.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'invalid_supersedes_ref'});
      this.#items.set(prior.knowledge_id,Object.freeze({...prior,state:'SUPERSEDED'}));
    }
    this.#items.set(n.knowledge_id,n);
    return Object.freeze({status:'GREEN',decision:'KNOWLEDGE_STORED',item:clone(n),audit_required:true,prod_write:false,additional_cost_target_eur:0});
  }
  get({context,knowledge_id}){
    const c=ctx(context); const item=this.#items.get(req(knowledge_id,'knowledge_id'));
    if(!item)return null;
    if(item.company_id!==c.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'cross_company_read'});
    return clone(item);
  }
  list({context,state}){
    const c=ctx(context);
    if(state!==undefined&&!STATES.has(state))throw new Error('invalid knowledge state');
    return [...this.#items.values()].filter(x=>x.company_id===c.company_id&&(state===undefined||x.state===state)).sort((a,b)=>a.knowledge_id.localeCompare(b.knowledge_id)).map(clone);
  }
  resolve({context,subject}){
    const c=ctx(context); const s=req(subject,'subject');
    const matches=[...this.#items.values()].filter(x=>x.company_id===c.company_id&&x.subject===s&&x.state!=='SUPERSEDED');
    if(!matches.length)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',detail:'knowledge_missing'});
    const validated=matches.filter(x=>x.state==='VALIDATED').sort((a,b)=>b.confidence-a.confidence);
    if(validated.length>1&&validated[0].content!==validated[1].content)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'conflicting_validated_knowledge'});
    const chosen=(validated[0]??matches.sort((a,b)=>b.confidence-a.confidence)[0]);
    if(chosen.confidence<0.8||chosen.state==='UNCERTAIN')return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',detail:'knowledge_not_reliable_enough'});
    return Object.freeze({status:'GREEN',decision:'KNOWLEDGE_RESOLVED',item:clone(chosen),audit_required:true});
  }
}

export const KNW001_CONTRACT=Object.freeze({engine_id:'KNW-001',environments:['LAB','PREPROD'],states:[...STATES],company_isolation:true,source_required:true,evidence_hash:'SHA-256',confidence_gate:0.8,prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});
