export const LIVE_CANARY_PERCENT=0;

export function stableBucket(value:string){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,16777619)>>>0;
  }
  return hash%10000;
}

export function selectRoute(cohortKey:string,percent:number){
  if(!Number.isFinite(percent)||percent<0||percent>25)throw new Error('unsafe_canary_percent');
  if(percent===0)return {route:'OLD' as const,bucket:null,reason:'ZERO_FAIL_CLOSED'};
  const key=String(cohortKey??'').trim();
  if(!key)return {route:'OLD' as const,bucket:null,reason:'MISSING_STABLE_COHORT_KEY'};
  const bucket=stableBucket(key);
  return {route:(bucket<Math.floor(percent*100)?'NEW':'OLD') as 'OLD'|'NEW',bucket,reason:'DETERMINISTIC_COHORT'};
}
