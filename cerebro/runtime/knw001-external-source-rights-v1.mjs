import { Knw001KnowledgeStoreV1 } from './foundation-holds-v1.mjs';
const RIGHTS = new Set(['FULLTEXT_ALLOWED','REFERENCE_ONLY','CONDITIONAL','BLOCKED','UNKNOWN']);
const STATUS = new Set(['SOURCE','CANDIDATE','VALIDATED','CANONICAL']);
const req=(x,k)=>{if(typeof x!=='string'||!x.trim())throw Error(k+' required');return x.trim();};
export function classifyExternalKnowledgeReferenceV1({
  company_id,engine_id,environment,version,
  source_type,source_ref,source_snapshot_at,observed_at,
  rights_status,license_evidence,confidence,
  content_status='SOURCE',content=null
}){
  const scope={company_id:req(company_id,'company_id'),engine_id:req(engine_id,'engine_id'),environment:req(environment,'environment'),version:req(version,'version')};
  if(scope.engine_id!=='KNW-001'||!['LAB','PREPROD'].includes(scope.environment))throw Error('KNW001_FAIL_CLOSED_SCOPE');
  const rights=req(rights_status,'rights_status');
  if(!RIGHTS.has(rights))throw Error('KNW001_RIGHTS_INVALID');
  if(!STATUS.has(content_status))throw Error('KNW001_CONTENT_STATE_INVALID');
  const ref=req(source_ref,'source_ref');
  const asof=Date.parse(req(source_snapshot_at,'source_snapshot_at')),observed=Date.parse(req(observed_at,'observed_at'));
  if(!Number.isFinite(asof)||!Number.isFinite(observed)||asof>observed)throw Error('KNW001_TIME_INVALID');
  if(typeof confidence!=='number'||confidence<0||confidence>1)throw Error('KNW001_CONFIDENCE_INVALID');
  const writable=rights==='FULLTEXT_ALLOWED' && typeof license_evidence==='string' && license_evidence.trim()!=='' && content!==null;
  const reference_only=rights==='REFERENCE_ONLY';
  const stale=observed-asof>24*60*60*1000;
  const allowed=writable && !stale && content_status!=='CANONICAL';
  const record={...scope,source_type:req(source_type,'source_type'),source_ref:ref,source_snapshot_at,observed_at,rights_status:rights,confidence,content_status,
    stale,reference_only,fulltext_ingestion_allowed:allowed,canonical_promotion_allowed:false,prod_writes:false,external_writes:false,
    status:reference_only?'REFERENCE_ONLY':!allowed?'HOLD_SOURCE_GATES':'CANDIDATE_ONLY'};
  if(rights==='BLOCKED'||rights==='UNKNOWN'||rights==='CONDITIONAL')record.status='HOLD_RIGHTS';
  return Object.freeze(record);
}
export function putGovernedExternalKnowledgeV1(store,decision,input){
  if(!(store instanceof Knw001KnowledgeStoreV1))throw Error('KNW001_STORE_INVALID');
  if(decision.fulltext_ingestion_allowed!==true||decision.canonical_promotion_allowed!==false)throw Error('KNW001_INGEST_DENIED');
  return store.put({...input,company_id:decision.company_id,engine_id:'KNW-001',environment:decision.environment,version:decision.version,
    lifecycle:'UNCERTAIN',source:{type:decision.source_type,ref:decision.source_ref}});
}
export const KNW001_EXTERNAL_SOURCES_CONTRACT_V1=Object.freeze({notion_reference_only_by_default:true,license_unknown_fails_closed:true,stale_source_blocks_ingestion:true,automatic_canonical_promotion:false,external_writes:false,prod_writes:false,trading_access:false,additional_cost_eur:0});
