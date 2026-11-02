import { assertNonEmptyString, assertNonNegativeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const STOROFF_001=deepFreeze({engine_id:'STOROFF-001',version:'0.1.0',layer:'L6',capability:'STORAGE_OFFLOAD_PLANNER_FOUNDATION',storage_execution:false,prod_writes:false,additional_cost_eur:0});
const COLD_TYPES=new Set(['BACKUP','HISTORICAL','DATASET','TRAINING_ARTIFACT','ARCHIVE']);

export function planStoragePlacement(input){
  const artifact_id=assertNonEmptyString(input?.artifact_id,'artifact_id');
  const company_id=assertNonEmptyString(input?.company_id,'company_id');
  const type=assertNonEmptyString(input?.type,'type').toUpperCase();
  const age_days=assertNonNegativeNumber(input?.age_days ?? 0,'age_days');
  const hot_retention_days=assertNonNegativeNumber(input?.hot_retention_days ?? 30,'hot_retention_days');
  const canonical_metadata_preserved=input?.canonical_metadata_preserved!==false;
  const cold=COLD_TYPES.has(type)||age_days>hot_retention_days;
  const target=cold?'COLD_OFFLOAD':'HOT_PRIMARY';
  return result('STOROFF-001',{artifact_id,company_id,type,age_days,hot_retention_days,status:'PLACEMENT_PLAN',target,canonical_metadata_preserved,storage_execution:false,requires_provider_selection:cold});
}
