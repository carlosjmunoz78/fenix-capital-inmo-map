/** ZEUS/JARVIS B6 readiness: a capability preflight wrapper around existing CEREBRO tools.
 * No new runtime/server, no execution, no connector login, no mutations, no spend.
 * Source of tool identities is trusted Capability Fabric registry, not model/voice text.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const KINDS=new Set(['READ','MUTATION']);
const PRIV=new Set(['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED']);
const ENV=new Set(['LAB','PREPROD','PROD']);
const RANK=new Map([['API',0],['MCP',1],['CLI',2],['BROWSER',3]]);
const valid=x=>typeof x==='string'&&ID.test(x);
const denied=reason=>Object.freeze({state:'DENY',reason,executed:false,spentEuro:0});
export function createJarvisB6CapabilityPreflight({identityProvider,registry,policy,audit}={}){
 if(typeof identityProvider?.verify!=='function'||typeof registry?.list!=='function'||
    typeof policy?.authorize!=='function'||typeof audit?.append!=='function')
    throw Error('B6_TRUSTED_ADAPTERS_REQUIRED');
 return Object.freeze({
  async plan({token,companyId,environment='LAB',sessionId,missionId,capability,
   operation='READ',privacy='INTERNAL',idempotencyKey=null,rollbackRef=null}={}){
   if(!valid(companyId)||!ENV.has(environment)||!valid(sessionId)||!valid(missionId)||
      !valid(capability)||!KINDS.has(operation)||!PRIV.has(privacy)||
      (idempotencyKey!==null&&!valid(idempotencyKey))||
      (rollbackRef!==null&&!valid(rollbackRef)))return denied('REQUEST_INVALID');
   if(!token)return denied('AUTH_REQUIRED');
   let principal;
   try{principal=await identityProvider.verify(token);}
   catch{return denied('AUTH_UNAVAILABLE');}
   if(!principal?.ownerId||principal.sessionId!==sessionId||
      !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT')||
      !Array.isArray(principal.authorizedCompanies)||!principal.authorizedCompanies.includes(companyId))
      return denied('OWNER_SCOPE_DENIED');
   // B6 never approves mutations. The preflight can describe a future bounded plan only.
   if(operation==='MUTATION'&&(!idempotencyKey||!rollbackRef))return denied('MUTATION_CONTRACT_INCOMPLETE');
   let grant;
   try{grant=await policy.authorize({token,companyId,environment,
    actionName:operation==='READ'?'JARVIS_CAPABILITY_DISCOVER':'JARVIS_CAPABILITY_PLAN_MUTATION'});}
   catch{return denied('B3_POLICY_UNAVAILABLE');}
   if(grant?.decision!=='ALLOW')return denied('B3_POLICY_DENIED');
   let options;
   try{options=await registry.list({companyId,environment,capability});}
   catch{return denied('CAPABILITY_REGISTRY_UNAVAILABLE');}
   if(!Array.isArray(options)||options.length>100)return denied('CATALOG_INVALID');
   const allowed=options.filter(x=>x&&valid(x.id)&&x.companyId===companyId&&x.environment===environment&&
     x.capability===capability&&x.isolation==='TENANT'&&x.enabled===true&&
     RANK.has(x.route)&&x.estimatedEuro===0&&
     (privacy==='PUBLIC'||privacy==='INTERNAL'||x.dataBoundary==='LOCAL_PRIVATE')&&
     (operation==='READ'||x.supportsRollback===true));
   allowed.sort((a,b)=>RANK.get(a.route)-RANK.get(b.route)||a.id.localeCompare(b.id));
   const selected=allowed[0];
   if(!selected)return denied('NO_SAFE_ZERO_COST_CAPABILITY');
   let done;
   try{done=await audit.append({eventCode:'B6_CAPABILITY_PLAN',companyId,environment,
    missionId,capability,route:selected.route,operation});}
   catch{return denied('AUDIT_UNAVAILABLE');}
   if(done!==true)return denied('AUDIT_UNAVAILABLE');
   return Object.freeze({state:'PLAN_ONLY_OFF',companyId,environment,missionId,capability,
    selectedCapabilityId:selected.id,route:selected.route,operation,
    requiresB3Authorization:true,requiresIndependentResultVerification:true,
    requiresReversibleExecution:operation==='MUTATION',
    executed:false,spentEuro:0});
  }
 });
}
