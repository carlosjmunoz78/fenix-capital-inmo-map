/**
 * CUT24 · B3 server-only D1 LAB adapters. Zero default grants.
 * D1 has NO RLS: NEVER expose the binding or mutation methods to client code.
 * Administrative enrolment is deliberately NOT implemented.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const valid=s=>typeof s==='string'&&ID.test(s);
const CONTROL="SELECT company_id,environment,enabled,kill_switch FROM jarvis_lab_b3_control_v0 WHERE company_id=? AND environment='LAB' LIMIT 1";
const GRANT="SELECT grant_id,owner_id,company_id,environment,action_name,active,revoked,max_cost,allow_mutations,expires_at_ms FROM jarvis_lab_b3_read_grant_v0 WHERE owner_id=? AND company_id=? AND environment='LAB' AND action_name='MISSION_INSPECT' AND active=1 AND revoked=0 AND expires_at_ms>? LIMIT 1";
const AUDIT="INSERT INTO jarvis_lab_b3_audit_v0 (event_code,action_name,company_id,engine_id,environment,grant_id,allowed,created_at_ms) VALUES (?,'MISSION_INSPECT',?,'JARVIS','LAB',?,?,?)";
const EVENT_CODES=new Set(['ALLOW','DENY','HUMAN_REQUIRED']);
const rowError=()=>{throw Error('D1_B3_ROW_INVALID')};
export function createJarvisD1B3Adapters({db,environment='LAB',clock=()=>Date.now()}={}){
 if(environment!=='LAB')throw TypeError('D1_B3_LAB_ONLY');
 if(typeof db?.prepare!=='function'||typeof clock!=='function')
  throw TypeError('TRUSTED_D1_B3_ADAPTERS_REQUIRED');
 const time=()=>{let now;try{now=clock()}catch{throw Error('D1_B3_CLOCK_UNAVAILABLE')}
  if(!Number.isSafeInteger(now)||now<=0)throw Error('D1_B3_CLOCK_UNAVAILABLE');
  return now;
 };
 const first=async(sql,values)=>{try{return await db.prepare(sql).bind(...values).first()}
  catch{throw Error('D1_B3_READ_UNAVAILABLE')}
 };
 const controlStore=Object.freeze({async get({companyId,environment:scope}={}){
  if(!valid(companyId)||scope!=='LAB')throw Error('D1_B3_SCOPE_INVALID');
  const row=await first(CONTROL,[companyId]);
  if(!row)return Object.freeze({enabled:false,killSwitch:true});
  if(row.company_id!==companyId||row.environment!=='LAB'||
     ![0,1].includes(row.enabled)||![0,1].includes(row.kill_switch))
     rowError();
  return Object.freeze({enabled:row.enabled===1,killSwitch:row.kill_switch===1});
 }});
 const grantStore=Object.freeze({async find({
  ownerId,companyId,environment:scope,actionName
 }={}){
  if(!valid(ownerId)||!valid(companyId)||scope!=='LAB'||!valid(actionName))
   throw Error('D1_B3_SCOPE_INVALID');
  if(actionName!=='MISSION_INSPECT')return null;
  const now=time();
  const row=await first(GRANT,[ownerId,companyId,now]);
  if(!row)return null;
  if(!valid(row.grant_id)||row.owner_id!==ownerId||row.company_id!==companyId||
     row.environment!=='LAB'||row.action_name!=='MISSION_INSPECT'||
     row.active!==1||row.revoked!==0||row.max_cost!==0||row.allow_mutations!==0||
     !Number.isSafeInteger(row.expires_at_ms)||row.expires_at_ms<=now)
     rowError();
  return Object.freeze({
   grantId:row.grant_id,ownerId,companyId,environment:'LAB',
   active:true,revoked:false,actions:Object.freeze(['MISSION_INSPECT']),
   expiresAt:row.expires_at_ms,maxCost:0,allowMutations:false
  });
 }});
 const actionCatalog=Object.freeze({async get(name){
  return name==='MISSION_INSPECT'?Object.freeze({
   name:'MISSION_INSPECT',mutating:false,estimatedCost:0
  }):null;
 }});
 const auditStore=Object.freeze({async append(event={}){
  const {eventCode,companyId,environment:scope,grantId,allowed}=event;
  if(!EVENT_CODES.has(eventCode)||!valid(companyId)||scope!=='LAB'||
     (grantId!=null&&!valid(grantId))||typeof allowed!=='boolean'||
     (eventCode==='ALLOW')!==allowed)
    return false;
  let result;
  try{
   result=await db.prepare(AUDIT).bind(
    eventCode,companyId,grantId??null,allowed?1:0,time()
   ).run();
  }catch{return false}
  return result?.success===true&&result?.meta?.changes===1;
 }});
 return Object.freeze({controlStore,grantStore,actionCatalog,auditStore});
}
