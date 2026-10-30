import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STATES=new Set(['CURRENT_CANONICAL','SUPERSEDED','DISPUTED','UNKNOWN']);
const KINDS=new Set(['PERSONAL','COMPANY','PROJECT','CONVERSATION','OPERATIONAL','PRECEDENT','LEARNING','TEMPORAL','RELATIONSHIP','FAILURE','CONSTRAINT','COMMITMENT','WORLD_OBSERVATION']);
const now=()=>new Date().toISOString();
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const req=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} required`);return v.trim();};

export function canonicalMemoryRecord(input={}){
 const company_id=req(input.company_id,'company_id');
 const project_id=req(input.project_id||'default','project_id');
 const kind=req(input.kind||'OPERATIONAL','kind');if(!KINDS.has(kind))throw new Error(`UNKNOWN_MEMORY_KIND:${kind}`);
 const state=req(input.state||'CURRENT_CANONICAL','state');if(!STATES.has(state))throw new Error(`UNKNOWN_MEMORY_STATE:${state}`);
 const effective_at=input.effective_at||input.observed_at||now();const observed_at=input.observed_at||now();const recorded_at=input.recorded_at||now();
 const record={memory_id:input.memory_id||`mem-${hash([company_id,project_id,kind,input.subject||'',input.content||'',recorded_at]).slice(0,24)}`,company_id,project_id,identity_id:req(input.identity_id||'jarvis','identity_id'),kind,state,subject:req(input.subject,'subject'),content:req(input.content,'content'),source:req(input.source||'unknown','source'),provenance:Object.freeze({...input.provenance}),confidence:Number.isFinite(Number(input.confidence))?Math.max(0,Math.min(1,Number(input.confidence))):0.5,effective_at,observed_at,recorded_at,valid_until:input.valid_until||null,supersedes:input.supersedes||null,tags:Object.freeze([...(input.tags||[]).map(String)]),sensitivity:req(input.sensitivity||'INTERNAL','sensitivity'),purpose:req(input.purpose||'mission','purpose'),deletion_state:req(input.deletion_state||'ACTIVE','deletion_state')};
 return Object.freeze({...record,record_hash:hash(record)});
}

export class JsonlMemoryStoreV1{
 #file;
 constructor({file}){this.#file=path.resolve(req(file,'file'));fs.mkdirSync(path.dirname(this.#file),{recursive:true});if(!fs.existsSync(this.#file))fs.writeFileSync(this.#file,'','utf8');}
 append(record){fs.appendFileSync(this.#file,JSON.stringify(record)+'\n','utf8');return record;}
 readAll(){const text=fs.readFileSync(this.#file,'utf8').trim();return text?text.split(/\r?\n/).map(JSON.parse):[];}
}

export class JarvisMemoryV1{
 #store;
 constructor({store}){if(!store||typeof store.append!=='function'||typeof store.readAll!=='function')throw new TypeError('memory store append/readAll required');this.#store=store;}
 remember(input){const record=canonicalMemoryRecord(input);const all=this.#store.readAll();if(all.some(x=>x.memory_id===record.memory_id))throw new Error(`MEMORY_ID_EXISTS:${record.memory_id}`);if(record.supersedes){const prior=all.find(x=>x.memory_id===record.supersedes);if(!prior)throw new Error(`SUPERSEDED_MEMORY_NOT_FOUND:${record.supersedes}`);if(prior.company_id!==record.company_id||prior.project_id!==record.project_id)throw new Error('CROSS_SCOPE_SUPERSESSION_DENIED');this.#store.append(canonicalMemoryRecord({...prior,memory_id:`evt-${hash([prior.memory_id,'superseded',record.memory_id]).slice(0,24)}`,state:'SUPERSEDED',recorded_at:record.recorded_at,source:'jarvis-memory-v1',content:`SUPERSEDED_BY:${record.memory_id}`,supersedes:prior.memory_id,provenance:{event:'SUPERSEDED',replacement:record.memory_id}}));}return this.#store.append(record);}
 query({company_id,project_id=null,identity_id='jarvis',kinds=null,states=['CURRENT_CANONICAL','DISPUTED','UNKNOWN'],text=null,as_of=null,limit=50}={}){const company=req(company_id,'company_id');const max=Math.max(1,Math.min(200,Number(limit)||50));const q=String(text||'').trim().toLowerCase();const kindSet=kinds?new Set(kinds):null;const stateSet=new Set(states);const cutoff=as_of?Date.parse(as_of):Infinity;const rows=this.#store.readAll().filter(x=>x.company_id===company&&(!project_id||x.project_id===project_id)&&x.identity_id===identity_id&&(!kindSet||kindSet.has(x.kind))&&stateSet.has(x.state)&&Date.parse(x.effective_at)<=cutoff&&x.deletion_state==='ACTIVE'&&(!q||`${x.subject} ${x.content} ${x.tags?.join(' ')}`.toLowerCase().includes(q)));rows.sort((a,b)=>Date.parse(b.recorded_at)-Date.parse(a.recorded_at)||a.memory_id.localeCompare(b.memory_id));return rows.slice(0,max);}
 recallContext({company_id,project_id,mission_tags=[],limit=24}={}){const terms=[...new Set((mission_tags||[]).map(x=>String(x).toLowerCase()))];const rows=this.query({company_id,project_id,limit:200});const scored=rows.map(x=>{const hay=`${x.subject} ${x.content} ${(x.tags||[]).join(' ')}`.toLowerCase();let score=x.confidence*10;if(x.state==='CURRENT_CANONICAL')score+=10;for(const t of terms)if(hay.includes(t))score+=5;return{x,score};}).sort((a,b)=>b.score-a.score||Date.parse(b.x.recorded_at)-Date.parse(a.x.recorded_at));return rows.length?scored.slice(0,Math.max(1,Math.min(64,limit))).map(v=>v.x):[];}
 integrity(){const rows=this.#store.readAll();const invalid=rows.filter(x=>{const {record_hash,...body}=x;return hash(body)!==record_hash;});return Object.freeze({ok:invalid.length===0,records:rows.length,invalid_hashes:invalid.map(x=>x.memory_id)});}
}

export const JARVIS_MEMORY_V1_CONTRACT=Object.freeze({capability:'JARVIS/WORLD-MEMORY-ACCESS-V1',environment:'PREPROD',append_only:true,company_scoped:true,project_scoped:true,identity_scoped:true,provenance_required:true,temporal_truth:true,supersession:true,contradiction_states:[...STATES],local_jsonl_backend:'CANDIDATE_ONLY',cloud_durable_backend:'NOT_YET_BOUND',prod_authorized:false,trading_access:false});
