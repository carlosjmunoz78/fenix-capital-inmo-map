import crypto from 'node:crypto';

const LIFE = new Set(['CURRENT','SUPERSEDED','UNCERTAIN','VALIDATED']);
const ENVS = new Set(['LAB','PREPROD']);
const str=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} required`);return v.trim();};
const num=(v,n)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new TypeError(`${n} invalid`);return v;};
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const scope=x=>Object.freeze({company_id:str(x.company_id,'company_id'),engine_id:str(x.engine_id,'engine_id'),environment:str(x.environment,'environment'),version:str(x.version,'version')});
const sameCompany=(a,b)=>a.company_id===b.company_id;

export class Knw001KnowledgeStoreV1 {
  #items=[];
  put(input){
    const s=scope(input);if(!ENVS.has(s.environment))throw new Error('KNW001_PROD_WRITE_DENIED');
    const lifecycle=str(input.lifecycle,'lifecycle');if(!LIFE.has(lifecycle))throw new Error('KNW001_LIFECYCLE_INVALID');
    const item=Object.freeze({...s,knowledge_id:str(input.knowledge_id,'knowledge_id'),subject:str(input.subject,'subject'),value:input.value??null,lifecycle,source:{type:str(input.source?.type,'source.type'),ref:str(input.source?.ref,'source.ref')},confidence:num(input.confidence,'confidence'),review_at:input.review_at??null,supersedes:input.supersedes??null,created_at:str(input.created_at,'created_at')});
    if(item.confidence>1)throw new Error('KNW001_CONFIDENCE_RANGE');
    if(item.supersedes){const prev=this.#items.find(x=>x.knowledge_id===item.supersedes&&sameCompany(x,item));if(!prev)throw new Error('KNW001_SUPERSEDES_NOT_FOUND');this.#items=this.#items.map(x=>x===prev?Object.freeze({...x,lifecycle:'SUPERSEDED'}):x);}
    this.#items.push(item);return item;
  }
  query({company_id,subject,include_uncertain=false}){const c=str(company_id,'company_id');return this.#items.filter(x=>x.company_id===c&&(!subject||x.subject===subject)&&x.lifecycle!=='SUPERSEDED'&&(include_uncertain||x.lifecycle!=='UNCERTAIN')).map(x=>structuredClone(x));}
  conflicts({company_id,subject}){const rows=this.query({company_id,subject,include_uncertain:true}).filter(x=>['CURRENT','VALIDATED','UNCERTAIN'].includes(x.lifecycle));const values=new Set(rows.map(x=>JSON.stringify(x.value)));return Object.freeze({conflict:values.size>1,items:rows,requires_review:values.size>1});}
}

export class Trn001TrainingLedgerV1 {
  #datasets=new Map();#runs=[];
  registerDataset({company_id,engine_id,dataset_id,version,cases,created_at}){const s=scope({company_id,engine_id,environment:'LAB',version});if(!Array.isArray(cases)||cases.length===0)throw new TypeError('cases required');const canonical=cases.map(x=>structuredClone(x));const row=Object.freeze({...s,dataset_id:str(dataset_id,'dataset_id'),dataset_hash:hash(canonical),case_count:canonical.length,created_at:str(created_at,'created_at')});this.#datasets.set(`${company_id}|${engine_id}|${dataset_id}|${version}`,{row,cases:canonical});return row;}
  recordRun({company_id,engine_id,dataset_id,dataset_version,run_id,candidate_version,metrics,created_at}){const key=`${company_id}|${engine_id}|${dataset_id}|${dataset_version}`;const dataset=this.#datasets.get(key);if(!dataset)throw new Error('TRN001_DATASET_NOT_FOUND');const row=Object.freeze({company_id:str(company_id,'company_id'),engine_id:str(engine_id,'engine_id'),environment:'LAB',dataset_id,dataset_version,dataset_hash:dataset.row.dataset_hash,run_id:str(run_id,'run_id'),candidate_version:str(candidate_version,'candidate_version'),metrics:structuredClone(metrics??{}),created_at:str(created_at,'created_at'),promotion_authorized:false,self_promote:false});this.#runs.push(row);return row;}
  compare({company_id,engine_id,champion_run_id,challenger_run_id,metric,higher_is_better=true}){const find=id=>this.#runs.find(x=>x.company_id===company_id&&x.engine_id===engine_id&&x.run_id===id);const champion=find(champion_run_id),challenger=find(challenger_run_id);if(!champion||!challenger)throw new Error('TRN001_RUN_NOT_FOUND');const a=champion.metrics?.[metric],b=challenger.metrics?.[metric];if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('TRN001_METRIC_MISSING');const challenger_wins=higher_is_better?b>a:b<a;return Object.freeze({champion_run_id,challenger_run_id,metric,champion_value:a,challenger_value:b,challenger_wins,tribunal_required:true,promotion_authorized:false});}
}

export class Finops001CostLedgerV1 {
  #events=[];#budgets=new Map();
  setBudget({company_id,engine_id,environment,version,budget_eur,hard_stop=true}){const s=scope({company_id,engine_id,environment,version});if(!ENVS.has(s.environment))throw new Error('FINOPS001_PROD_BUDGET_WRITE_DENIED');const row=Object.freeze({...s,budget_eur:num(budget_eur,'budget_eur'),hard_stop:Boolean(hard_stop)});this.#budgets.set(`${s.company_id}|${s.engine_id}|${s.environment}|${s.version}`,row);return row;}
  ingest(input){const s=scope(input);if(!ENVS.has(s.environment))throw new Error('FINOPS001_PROD_EVENT_WRITE_DENIED');const event=Object.freeze({...s,event_id:str(input.event_id,'event_id'),task_id:str(input.task_id,'task_id'),provider:str(input.provider,'provider'),resource_type:str(input.resource_type,'resource_type'),cost_eur:num(input.cost_eur,'cost_eur'),savings_eur:num(input.savings_eur??0,'savings_eur'),occurred_at:str(input.occurred_at,'occurred_at')});if(this.#events.some(x=>x.event_id===event.event_id&&x.company_id===event.company_id))return Object.freeze({accepted:true,deduplicated:true,event});this.#events.push(event);const usage=this.usage(s);const budget=this.#budgets.get(`${s.company_id}|${s.engine_id}|${s.environment}|${s.version}`);const pct=budget&&budget.budget_eur>0?usage.cost_eur/budget.budget_eur:0;return Object.freeze({accepted:true,deduplicated:false,event,usage,budget:budget??null,alert_threshold:pct>=1?'100':pct>=.9?'90':pct>=.75?'75':pct>=.5?'50':null,hard_stop:Boolean(budget?.hard_stop&&usage.cost_eur>=budget.budget_eur)});}
  usage(filter){const s=scope(filter);const rows=this.#events.filter(x=>x.company_id===s.company_id&&x.engine_id===s.engine_id&&x.environment===s.environment&&x.version===s.version);return Object.freeze({event_count:rows.length,cost_eur:rows.reduce((a,x)=>a+x.cost_eur,0),savings_eur:rows.reduce((a,x)=>a+x.savings_eur,0),by_provider:Object.freeze(Object.fromEntries([...new Set(rows.map(x=>x.provider))].sort().map(p=>[p,rows.filter(x=>x.provider===p).reduce((a,x)=>a+x.cost_eur,0)])))});}
}

export const FOUNDATION_HOLDS_V1_CONTRACT=Object.freeze({
  'KNW-001':{lifecycle:[...LIFE],cross_company_default_deny:true,source_provenance:true,conflict_detection:true,prod_write_authorized:false},
  'TRN-001':{dataset_versioning:true,run_id:true,metrics:true,champion_challenger:true,tribunal_required:true,self_promote:false,prod_write_authorized:false},
  'FINOPS-001':{cost_events:true,provider_attribution:true,budgets:true,alerts:[50,75,90,100],hard_stop:true,idempotency:true,prod_write_authorized:false},
  additional_cost_eur:0,trading_access:false,
});
