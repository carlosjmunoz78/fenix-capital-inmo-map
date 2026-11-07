/**
 * CUT26: atomic daily cap for JARVIS gateway-denial audit writes on Cloudflare
 * D1 LAB. This replaces the unimplemented CUT25 quotaGuard dependency with
 * a concrete, server-only reservation function.
 *
 * Single UPSERT RETURNING is atomic across Worker instances sharing the
 * SAME D1 database. No session, owner, IP, URL, company, bearer, or PII stored.
 * One successful reservation can cause at most one audit append attempt.
 * This is a hard ceiling for THIS audit path, NOT for all account usage or
 * other Workers / D1 databases. No Cloudflare deployment performed.
 */
const SQL=`INSERT INTO jarvis_lab_denial_quota_v0
 (usage_day,environment,quota_name,consumed,max_per_day)
 VALUES (?,'LAB','GATEWAY_DENIAL',1,?)
 ON CONFLICT(usage_day,environment,quota_name) DO UPDATE
 SET consumed=consumed+1
 WHERE consumed < max_per_day AND max_per_day=excluded.max_per_day
 RETURNING consumed`;
export const CUT26_DEFAULT_DAILY_BUDGET=500;
export function createJarvisD1StrictDenialQuotaGuard({
 db,clock=()=>Date.now(),environment='LAB',
 maxDailyWrites=CUT26_DEFAULT_DAILY_BUDGET
}={}){
 if(environment!=='LAB')throw TypeError('QUOTA_LAB_ONLY');
 if(typeof db?.prepare!=='function'||typeof clock!=='function')
  throw TypeError('TRUSTED_D1_QUOTA_BINDING_REQUIRED');
 if(!Number.isSafeInteger(maxDailyWrites)||maxDailyWrites<1||maxDailyWrites>1000)
  throw TypeError('QUOTA_SAFE_BOUND_INVALID');
 return async function reserveOneAuditWrite(){
  let milliseconds;
  try{milliseconds=clock()}catch{return false}
  if(!Number.isSafeInteger(milliseconds)||milliseconds<=0)
   return false;
  let day;
  try{day=new Date(milliseconds).toISOString().slice(0,10)}
  catch{return false}
  let row;
  try{row=await db.prepare(SQL).bind(day,maxDailyWrites).first()}
  catch{return false}
  return row!=null&&Number.isSafeInteger(row.consumed)&&
    row.consumed>=1&&row.consumed<=maxDailyWrites;
 };
}
