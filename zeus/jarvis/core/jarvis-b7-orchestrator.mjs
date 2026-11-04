/** JARVIS B7 CUT01 · Logical specialists over existing B3/B6/FACT-001 ports.
 * LAB/READ only, no server, new grants, PROD endpoint or paid providers.
 */
import {createHash} from 'node:crypto';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const id=x=>typeof x==='string'&&ID.test(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const deny=reason=>({state:'DENY',reason,executed:false,spentEuro:0});
const receiptOk=r=>['EXECUTED_VERIFIED_READ','ALREADY_COMPLETED_VERIFIED'].includes(r?.state)
 &&/^[a-f0-9]{64}$/.test(r?.evidenceHash)&&r.spentEuro===0;
export const B7_LIMITS=Object.freeze({maxTasks:16,maxParallel:3,maxDepth:4,maxRuntimeMs:30000,maxEuro:0});
export function createJarvisB7Orchestrator({catalog,policy,b6Executor,supervisor,tribunal,audit,clock=()=>Date.now()}={}){
 if(typeof catalog?.resolve!=='function'||typeof policy?.authorize!=='function'||
 typeof b6Executor?.executeRead!=='function'||typeof supervisor?.inspect!=='function'||
 typeof tribunal?.verify!=='function'||typeof audit?.append!=='function')
 throw Error('B7_SERVER_PORTS_REQUIRED');
 async function alive(m,t=null){
  try{const s=await supervisor.inspect({companyId:m.companyId,environment:'LAB',missionId:m.missionId,taskId:t});
   return s?.enabled===true&&s.killSwitch===false&&s.revoked!==true&&s.halted!==true&&s.costEuro===0;}
  catch{return false;}
 }
 async function auditEvent(code,m,t=null,h=null){
  try{return await audit.append({eventCode:code,companyId:m.companyId,environment:'LAB',
   missionId:m.missionId,taskId:t,evidenceHash:h,engineId:'ORCH-001',version:m.version})===true;}
  catch{return false;}
 }
 async function prepare(m){
  if(!m||m.environment!=='LAB'||m.engineId!=='ORCH-001'||![m.companyId,m.ownerId,m.sessionId,m.missionId,m.version].every(id)||
   !Array.isArray(m.tasks)||!m.tasks.length||m.tasks.length>B7_LIMITS.maxTasks||
   m.maxEuro!==0||!Number.isInteger(m.maxParallel)||m.maxParallel<1||m.maxParallel>B7_LIMITS.maxParallel||
   !Number.isInteger(m.timeoutMs)||m.timeoutMs<1||m.timeoutMs>B7_LIMITS.maxRuntimeMs)
   return {error:'MISSION_INVALID'};
  const byId=new Map(),keys=new Set();
  for(const t of m.tasks){
   if(!t||![t.taskId,t.capability,t.idempotencyKey].every(id)||
    t.operation!=='READ'||!Number.isInteger(t.depth)||t.depth<0||t.depth>B7_LIMITS.maxDepth||
    !Array.isArray(t.dependsOn)||t.dependsOn.some(d=>!id(d))||
    byId.has(t.taskId)||keys.has(t.idempotencyKey)||
    Object.keys(t).some(k=>!['taskId','capability','idempotencyKey','dependsOn','depth','operation'].includes(k))||
    (m.missionId+'/'+t.taskId).length>180)return {error:'TASK_INVALID'};
   byId.set(t.taskId,t);keys.add(t.idempotencyKey);
  }
  for(const t of m.tasks)if(t.dependsOn.includes(t.taskId)||new Set(t.dependsOn).size!==t.dependsOn.length||
   t.dependsOn.some(d=>!byId.has(d)))return {error:'DEPENDENCY_INVALID'};
  const visiting=new Set(),depths=new Map();
  function depth(k){
   if(visiting.has(k))throw Error('CYCLE');
   if(depths.has(k))return depths.get(k);
   visiting.add(k);
   const d=byId.get(k).dependsOn.length?1+Math.max(...byId.get(k).dependsOn.map(depth)):0;
   visiting.delete(k);depths.set(k,d);return d;
  }
  try{for(const k of byId.keys())if(depth(k)>B7_LIMITS.maxDepth)return {error:'DEPTH_EXCEEDED'};}
  catch{return {error:'DEPENDENCY_CYCLE'};}
  const bound=[];
  for(const t of m.tasks){
   let a;try{a=await catalog.resolve({companyId:m.companyId,environment:'LAB',
    capability:t.capability,engineId:m.engineId,version:m.version});}
   catch{return {error:'CATALOG_UNAVAILABLE'};}
   if(!a||a.companyId!==m.companyId||a.environment!=='LAB'||!id(a.specialistId)||
    !id(a.engineId)||!id(a.version)||a.capability!==t.capability||a.enabled!==true||
    a.mode!=='B6_CONTROLLED_READ'||a.operation!=='READ'||a.mutating!==false||
    a.estimatedEuro!==0||a.canDelegate!==false||!Array.isArray(a.permissions)||
    !a.permissions.includes('JARVIS_CAPABILITY_EXECUTE_READ'))
    return {error:'SPECIALIST_CONTRACT_INVALID'};
   bound.push({task:t,specialistId:a.specialistId,engineId:a.engineId});
  }
  return {bound,planFingerprint:digest({companyId:m.companyId,missionId:m.missionId,
   ownerId:m.ownerId,version:m.version,tasks:m.tasks})};
 }
 return Object.freeze({limits:B7_LIMITS,async executeMission({mission:m,token}={}){
  if(m?.environment==='PROD')return deny('PROD_NOT_CERTIFIED');
  if(!token)return deny('AUTH_REQUIRED');
  const p=await prepare(m);if(p.error)return deny(p.error);
  if(!await alive(m))return deny('SUPERVISOR_STOP');
  if(!await auditEvent('B7_MISSION_STARTED',m))return deny('AUDIT_UNAVAILABLE');
  const start=clock(),state=new Map(),out=[];
  async function execute(b){
   const t=b.task;
   const blocked=reason=>({taskId:t.taskId,state:'BLOCKED',reason});
   if(clock()-start>m.timeoutMs)return blocked('TIMEOUT');
   if(!await alive(m,t.taskId))return blocked('SUPERVISOR_STOP');
   let a;try{a=await policy.authorize({token,companyId:m.companyId,environment:'LAB',
    missionId:m.missionId,capability:t.capability,specialistId:b.specialistId,
    actionName:'JARVIS_CAPABILITY_DELEGATE_READ'});}
   catch{return blocked('B3_UNAVAILABLE');}
   if(a?.decision!=='ALLOW')return blocked('B3_DELEGATION_DENIED');
   if(!await alive(m,t.taskId))return blocked('SUPERVISOR_STOP');
   if(!await auditEvent('B7_TASK_DISPATCH',m,t.taskId))return blocked('AUDIT_UNAVAILABLE');
   let r;try{r=await b6Executor.executeRead({token,companyId:m.companyId,environment:'LAB',
    sessionId:m.sessionId,missionId:m.missionId+'/'+t.taskId,capability:t.capability,
    idempotencyKey:t.idempotencyKey,operation:'READ'});}
   catch{return blocked('B6_UNAVAILABLE');}
   if(!receiptOk(r))return blocked('B6_DENIED_OR_UNVERIFIED');
   if(!await alive(m,t.taskId))return blocked('SUPERVISOR_STOP_AFTER_READ');
   let v;try{v=await tribunal.verify({companyId:m.companyId,environment:'LAB',missionId:m.missionId,
    taskId:t.taskId,specialistId:b.specialistId,evidenceHash:r.evidenceHash,receipt:r});}
   catch{return blocked('TRIBUNAL_UNAVAILABLE');}
   if(v?.decision!=='ACCEPT'||v.verified!==true||!id(v.verifierId)||
    v.verifierId===b.specialistId||v.verifierId==='JARVIS_B7_ORCHESTRATOR'||
    v.evidenceHash!==r.evidenceHash)return blocked('TRIBUNAL_REJECTED');
   if(!await auditEvent('B7_TASK_ACCEPTED',m,t.taskId,r.evidenceHash))return blocked('AUDIT_UNAVAILABLE');
   return {taskId:t.taskId,state:'ACCEPTED',specialistId:b.specialistId,
    engineId:b.engineId,evidenceHash:r.evidenceHash,replayed:r.state==='ALREADY_COMPLETED_VERIFIED'};
  }
  const pending=new Map(p.bound.map(b=>[b.task.taskId,b]));
  while(pending.size){
   const ready=[...pending.values()].filter(b=>b.task.dependsOn.every(d=>state.get(d)==='ACCEPTED'));
   if(!ready.length){for(const [k] of pending){state.set(k,'BLOCKED');out.push({taskId:k,state:'BLOCKED',reason:'DEPENDENCY_FAILED'});}break;}
   const batch=ready.slice(0,m.maxParallel);
   for(const b of batch)pending.delete(b.task.taskId);
   const results=await Promise.all(batch.map(execute));
   for(const result of results){state.set(result.taskId,result.state);out.push(result);}
   if(clock()-start>m.timeoutMs||!await alive(m)){
    for(const [k] of pending){state.set(k,'BLOCKED');out.push({taskId:k,state:'BLOCKED',reason:'SUPERVISOR_STOP_OR_TIMEOUT'});}break;
   }
  }
  const accepted=out.filter(t=>t.state==='ACCEPTED').length,ok=accepted===m.tasks.length;
  if(!await auditEvent(ok?'B7_MISSION_ACCEPTED':'B7_MISSION_PARTIAL',m))return deny('FINAL_AUDIT_UNAVAILABLE');
  return Object.freeze({state:ok?'LAB_ACCEPTED':'LAB_PARTIAL',companyId:m.companyId,
   environment:'LAB',missionId:m.missionId,engineId:'ORCH-001',version:m.version,
   planFingerprint:p.planFingerprint,executed:accepted>0,accepted,total:m.tasks.length,spentEuro:0,results:out});
 }});
}
