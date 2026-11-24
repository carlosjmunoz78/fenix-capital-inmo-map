// FACT-001 / LRN-001 CP04 additive candidate intake. Pure offline function.
// Trusted caller must authenticate owner selection and private storage. No publish or dispatch.
import {createHash} from 'node:crypto';
import {learningBinding,validateLearningBinding,getLearningPolicy,POLICY_SHA256} from './skill-universal-learning-contract-v1.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const canon=x=>JSON.stringify(Array.isArray(x)?x.map(v=>JSON.parse(canon(v))):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canon(x[k]))])):x);
const equal=(a,b)=>canon(a)===canon(b), req=(x,m)=>{if(!x)throw Error(m)}, hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x), id=x=>typeof x==='string'&&x.length<=64&&/^cerebro-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const kinds=['CHAMPION','CHALLENGER','EXTENSION','NEW'];
function bind(r){const b=learningBinding({identity:r.skill_id,revision_sha256:r.sha256});validateLearningBinding(b);return b;}
export function validatePrivateInventory(s){
 req(s?.policy_sha256===POLICY_SHA256&&equal(s.policy,getLearningPolicy())&&s.execution_completed===false&&s.promotion_authorized===false&&Array.isArray(s.records)&&s.records.length>0,'SCOPE');
 const seen=new Set(),ids=new Set(),champions=new Map();
 for(const r of s.records){req(id(r.skill_id)&&hex(r.sha256)&&kinds.includes(r.revision)&&typeof r.origin==='string'&&r.origin.trim()&&r.policy_sha256===POLICY_SHA256&&r.promotion==='HOLD'&&r.additional_cost_eur===0,'RECORD'); const k=r.skill_id+'|'+r.sha256;req(!seen.has(k),'DUPLICATE');seen.add(k);ids.add(r.skill_id);req(equal(r.mechanisms,bind(r).mechanisms),'BINDING');if(r.revision==='CHAMPION'){req(!champions.has(r.skill_id),'CHAMPION_DUPLICATE');champions.set(r.skill_id,r.sha256);}}
 for(const r of s.records){if(['CHALLENGER','EXTENSION'].includes(r.revision))req(champions.get(r.skill_id)===r.base_sha256,'BASE');else req(r.base_sha256===null,'BASE_UNEXPECTED');if(r.revision==='NEW')req(!champions.has(r.skill_id),'NEW_HAS_CHAMPION');}
 req(s.distinct_skills===ids.size&&s.revisions===s.records.length&&s.binding_count===s.records.length*12,'COUNTS');return {distinct_skills:ids.size,revisions:s.records.length,binding_count:s.records.length*12};
}
export function verifyAdditiveSnapshot(previous,next){validatePrivateInventory(previous);const counts=validatePrivateInventory(next);req(next.records.length>=previous.records.length&&previous.records.every((r,i)=>equal(r,next.records[i])),'HISTORY_CHANGED');req(next.records.slice(previous.records.length).every(r=>r.revision!=='CHAMPION'),'PROMOTION_FORBIDDEN');return counts;}
export function appendPrivateCandidates(snapshot,candidates,{ownerSelectedIds,expectedSnapshotSha256,environment}={}){
 validatePrivateInventory(snapshot);req(environment==='LAB'&&expectedSnapshotSha256===hash(canon(snapshot)),'STALE_OR_SCOPE');req(Array.isArray(candidates)&&candidates.length>0&&candidates.length<=10&&Array.isArray(ownerSelectedIds)&&new Set(ownerSelectedIds).size===ownerSelectedIds.length&&ownerSelectedIds.every(id),'SELECTION');
 const next=structuredClone(snapshot), added=[];
 for(const p of candidates){req(p&&id(p.skill_id)&&ownerSelectedIds.includes(p.skill_id)&&['NEW','CHALLENGER','EXTENSION'].includes(p.revision)&&p.environment==='LAB'&&p.promotion==='HOLD'&&p.additional_cost_eur===0&&p.external_code_imported===false&&typeof p.origin==='string'&&p.origin.trim(),'CANDIDATE');req(typeof p.content==='string'&&Buffer.byteLength(p.content)>=50&&Buffer.byteLength(p.content)<=1048576&&hash(p.content)===p.sha256,'ARTIFACT');const fm=p.content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];req(fm&&fm.split(/\r?\n/).filter(l=>/^name\s*:/.test(l)).length===1&&fm.split(/\r?\n/).includes('name: '+p.skill_id)&&/^description:\s+\S/m.test(fm),'IDENTITY');
 const prior=next.records.filter(r=>r.skill_id===p.skill_id),same=prior.find(r=>r.sha256===p.sha256);if(same){req(same.revision===p.revision&&same.base_sha256===p.base_sha256,'DUPLICATE_CONFLICT');continue;}
 if(p.revision==='NEW')req(p.base_sha256===null&&!prior.some(r=>r.revision!=='NEW'),'NEW_COLLISION');else req(prior.some(r=>r.revision==='CHAMPION'&&r.sha256===p.base_sha256),'BASE');
 const r={skill_id:p.skill_id,revision:p.revision,sha256:p.sha256,base_sha256:p.base_sha256,origin:p.origin,policy_sha256:POLICY_SHA256,mechanisms:bind(p).mechanisms,promotion:'HOLD',additional_cost_eur:0};next.records.push(r);added.push(r.skill_id);
 }
 next.distinct_skills=new Set(next.records.map(r=>r.skill_id)).size;next.revisions=next.records.length;next.binding_count=next.revisions*12;if(added.length)next.scope='PRIVATE_CANDIDATE_OVERLAY_NOT_RUNTIME';verifyAdditiveSnapshot(snapshot,next);return {snapshot:next,added:added.length,duplicates:candidates.length-added.length,status:'CANDIDATE_ONLY',promotion_authorized:false,provider_calls:0};
}
export const snapshotSha256=s=>hash(canon(s));
