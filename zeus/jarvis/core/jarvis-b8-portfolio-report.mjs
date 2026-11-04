/** B8 CUT03 · Read-only multi-company portfolio status projection.
 * No telemetry stores created. Only trusted, company-scoped, evidenced snapshots.
 * No fabricated KPIs; unavailable sources are explicitly NOT_CONNECTED.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const deny=reason=>Object.freeze({state:'DENY',reason,executed:false,prodAuthorized:false});
const STATUSES=new Set(['REGISTERED','ACTIVE','INACTIVE','HOLD']);
function cleanMetrics(s,companyId){
 if(s?.sourceState==='NOT_CONNECTED')return {sourceState:'NOT_CONNECTED',missionCounts:null,observedCostEuro:null,
  incidents:null,evidenceRefs:[],observedAt:null};
 if(s?.sourceState!=='VERIFIED'||s?.companyId!==companyId||s?.environment!=='LAB'||
  !Array.isArray(s.evidenceRefs)||!s.evidenceRefs.length||
  s.evidenceRefs.some(e=>!valid(e))||typeof s.observedAt!=='string'||
  !Number.isFinite(Date.parse(s.observedAt)))return null;
 const m=s.missionCounts;
 if(!m||!['running','pending','blocked','verified'].every(k=>Number.isSafeInteger(m[k])&&m[k]>=0)||
  Object.keys(m).some(k=>!['running','pending','blocked','verified'].includes(k)))return null;
 if(s.observedCostEuro!==null&&
  (typeof s.observedCostEuro!=='number'||!Number.isFinite(s.observedCostEuro)||s.observedCostEuro<0))
  return null;
 if(!Number.isSafeInteger(s.incidents)||s.incidents<0)return null;
 return {sourceState:'VERIFIED',missionCounts:{...m},observedCostEuro:s.observedCostEuro,
  incidents:s.incidents,evidenceRefs:[...new Set(s.evidenceRefs)],observedAt:new Date(s.observedAt).toISOString()};
}
export function createJarvisB8PortfolioSupervisor({identityProvider,companyRegistry,policy,supervisor,observability,audit}={}){
 if(typeof identityProvider?.verify!=='function'||typeof companyRegistry?.resolve!=='function'||
 typeof policy?.authorize!=='function'||typeof supervisor?.inspect!=='function'||
 typeof observability?.readCompanySnapshot!=='function'||typeof audit?.append!=='function')
 throw Error('B8_EXISTING_SUPERVISOR_PORTS_REQUIRED');
 return Object.freeze({async report({token,companyIds,environment='LAB'}={}){
  if(environment!=='LAB')return deny('PROD_NOT_CERTIFIED');
  if(!Array.isArray(companyIds)||!companyIds.length||companyIds.length>12||
   companyIds.some(c=>!valid(c))||new Set(companyIds).size!==companyIds.length)return deny('COMPANY_SELECTION_INVALID');
  let owner;
  try{owner=await identityProvider.verify(token);}catch{return deny('IDENTITY_UNAVAILABLE');}
  if(!owner?.roles?.includes('OWNER_ROOT')||!valid(owner.ownerId)||
   !Array.isArray(owner.authorizedCompanies)||
   companyIds.some(c=>!owner.authorizedCompanies.includes(c)))return deny('OWNER_COMPANY_SCOPE_DENIED');
  // Pre-authorize the entire company set before exposing even one result.
  const safe=[];
  for(const companyId of companyIds){
   let company,permit,control;
   try{
    company=await companyRegistry.resolve({companyId,environment:'LAB'});
    permit=await policy.authorize({token,companyId,environment:'LAB',
     actionName:'JARVIS_B8_PORTFOLIO_READ'});
    control=await supervisor.inspect({companyId,environment:'LAB'});
   }catch{return deny('POLICY_OR_REGISTRY_UNAVAILABLE');}
   if(company?.companyId!==companyId||company.environment!=='LAB'||company.verified!==true||
    !STATUSES.has(company.status)||permit?.decision!=='ALLOW'||control?.enabled!==true||
    control.killSwitch!==false||control.halted===true||control.revoked===true||
    control.costEuro!==0)return deny('COMPANY_POLICY_OR_SUPERVISOR_DENIED');
   safe.push({companyId,status:company.status});
  }
  const rows=[];
  for(const company of safe){
   let data;
   try{data=await observability.readCompanySnapshot({companyId:company.companyId,environment:'LAB',
    engineId:'SUP-001',version:'0.1.0'});}
   catch{return deny('OBSERVABILITY_UNAVAILABLE');}
   const m=cleanMetrics(data,company.companyId);
   if(!m)return deny('OBSERVABILITY_SCOPE_OR_EVIDENCE_INVALID');
   let ok;
   try{ok=await audit.append({eventCode:'B8_PORTFOLIO_COMPANY_READ',companyId:company.companyId,
    ownerId:owner.ownerId,engineId:'SUP-001',environment:'LAB',version:'0.1.0',
    evidenceCount:m.evidenceRefs.length});}catch{return deny('AUDIT_UNAVAILABLE');}
   if(ok!==true)return deny('AUDIT_UNAVAILABLE');
   rows.push(Object.freeze({companyId:company.companyId,registryState:company.status,...m}));
  }
  return Object.freeze({state:'LAB_PORTFOLIO_REPORT',engineId:'SUP-001',environment:'LAB',
   version:'0.1.0',ownerId:owner.ownerId,sourceType:'LOCAL_LAB_TEST',
   companies:rows,measuredCompanyCount:rows.filter(r=>r.sourceState==='VERIFIED').length,
   missingCompanyCount:rows.filter(r=>r.sourceState==='NOT_CONNECTED').length,
   noSyntheticKpisInserted:true,spentEuro:0,prodAuthorized:false});
 }});
}
