export const LIVE_CANARY_PERCENT=0;

function b64urlJson(value:string){
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  const raw=atob(normalized);
  return JSON.parse(raw);
}

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

export function cohortKeyFromRequest(req:Request){
  const explicit=req.headers.get('x-cerebro-session-id')||req.headers.get('idempotency-key');
  if(explicit)return explicit.slice(0,240);
  const auth=req.headers.get('authorization')??'';
  if(!auth.startsWith('Bearer '))return '';
  try{
    const parts=auth.slice(7).split('.');
    if(parts.length!==3)return '';
    const payload=b64urlJson(parts[1]);
    return typeof payload?.sub==='string'&&payload.sub?`sub:${payload.sub}`:'';
  }catch{return '';}
}
