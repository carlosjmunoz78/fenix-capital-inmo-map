import crypto from 'node:crypto';

const HORIZONS=['NOW','EMERGING','COMING','FRONTIER'];
const QUESTIONS=[
  'What materially improved in this specialty since the previous review?',
  'What new tool, model, paper, codec, device or workflow could improve quality, speed, cost, safety or autonomy?',
  'What existing capability became obsolete, redundant or inferior?',
  'What new benchmark or professional practice should be learned?',
  'What is announced but not yet production-ready?',
  'What frontier research could change this specialty and what prerequisite should we prepare now?'
];

export function createLearningInboxItem({role_id,department_id,company_id='GLOBAL',horizon='NOW',question,source='ROLE_SELF_REVIEW'}){
  if(!role_id||!question) throw new Error('role_id and question are required');
  if(!HORIZONS.includes(horizon)) throw new Error('invalid horizon');
  return {request_id:`LQ-${crypto.randomUUID()}`,role_id,department_id,company_id,horizon,question,source,status:'OPEN',created_at:new Date().toISOString()};
}

export function generateDailyRoleQuestions({role_id,department_id,company_id='GLOBAL'}){
  return HORIZONS.flatMap((horizon,index)=>[
    createLearningInboxItem({role_id,department_id,company_id,horizon,question:QUESTIONS[index%QUESTIONS.length]}),
    createLearningInboxItem({role_id,department_id,company_id,horizon,question:QUESTIONS[(index+2)%QUESTIONS.length]})
  ]);
}

export function dedupeLearningRequests(items=[]){
  const seen=new Set();
  return items.filter(item=>{const k=`${item.department_id||''}|${item.horizon}|${item.question.trim().toLowerCase()}`;if(seen.has(k))return false;seen.add(k);return true;});
}

export function buildScoutBatch(items=[]){
  const deduped=dedupeLearningRequests(items);
  return {batch_id:`SCOUT-${crypto.randomUUID()}`,created_at:new Date().toISOString(),requests:deduped,required_pipeline:['discover','license_security_rights_check','capability_mapping','duplicate_gap_analysis','LAB_benchmark','quality_cost_latency_privacy_score','OLD_vs_NEW','tribunal','register_promote_or_reject','learning_memory']};
}
