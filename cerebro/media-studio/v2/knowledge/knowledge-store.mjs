import crypto from 'node:crypto';

const ACCEPTED_SOURCE_TYPES=new Set(['STANDARD','OFFICIAL_DOC','PAPER','BOOK','COURSE','CASE_STUDY','TOOL_DOC','BENCHMARK','PRODUCTION_POSTMORTEM','INTERNAL_RESULT']);
const BENCHMARK_REQUIRED_SOURCE_TYPES=new Set(['PAPER','TOOL_DOC','CASE_STUDY']);
const HORIZONS=new Set(['NOW','EMERGING','COMING','FRONTIER']);

export function createKnowledgeItem({role_ids=[],department_ids=[],topic,horizon='NOW',source,evidence,confidence=0.5,status='DISCOVERED',version='1.0.0',next_review_at=null,supersedes=null}){
  if(!topic||!source?.source_id||!source?.source_type||!source?.publisher||!source?.uri||!evidence?.summary||!evidence?.provenance_ref) throw new Error('INCOMPLETE_KNOWLEDGE_ITEM');
  if(!ACCEPTED_SOURCE_TYPES.has(source.source_type)) throw new Error('UNKNOWN_SOURCE_TYPE');
  if(!HORIZONS.has(horizon)) throw new Error('UNKNOWN_HORIZON');
  if(confidence<0||confidence>1) throw new Error('INVALID_CONFIDENCE');
  return {knowledge_id:`KN-${crypto.randomUUID()}`,role_ids:[...new Set(role_ids)],department_ids:[...new Set(department_ids)],topic,horizon,source,evidence,confidence,status,version,observed_at:new Date().toISOString(),next_review_at,supersedes,old_vs_new_ref:null,tribunal_ref:null};
}

export function verifyKnowledgeItem(item,{old_vs_new_ref=null,tribunal_ref=null,benchmark_ref=null}={}){
  if(!item?.knowledge_id) throw new Error('KNOWLEDGE_ITEM_REQUIRED');
  if(item.confidence<0.7) return {...item,status:'BENCHMARK_REQUIRED'};
  if(BENCHMARK_REQUIRED_SOURCE_TYPES.has(item.source?.source_type)&&!benchmark_ref) return {...item,status:'BENCHMARK_REQUIRED'};
  return {...item,status:'VERIFIED',old_vs_new_ref,tribunal_ref,benchmark_ref:benchmark_ref||null};
}

export function promoteKnowledgeItem(item,{old_vs_new_ref,tribunal_ref}){
  if(item.status!=='VERIFIED') throw new Error('KNOWLEDGE_NOT_VERIFIED');
  if(!old_vs_new_ref||!tribunal_ref) throw new Error('OLD_VS_NEW_AND_TRIBUNAL_REQUIRED');
  return {...item,status:'ACCEPTED',old_vs_new_ref,tribunal_ref,accepted_at:new Date().toISOString()};
}

export function supersedeKnowledgeItem(oldItem,newItem){
  if(!oldItem?.knowledge_id||!newItem?.knowledge_id) throw new Error('KNOWLEDGE_ITEMS_REQUIRED');
  return [{...oldItem,status:'SUPERSEDED',superseded_by:newItem.knowledge_id},{...newItem,supersedes:oldItem.knowledge_id}];
}

export function knowledgeForRole(items,role_id){return items.filter(x=>x.status==='ACCEPTED'&&x.role_ids.includes(role_id));}
