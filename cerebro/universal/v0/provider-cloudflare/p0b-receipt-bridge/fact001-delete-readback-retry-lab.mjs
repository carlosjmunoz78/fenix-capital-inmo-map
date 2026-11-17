/** FACT-001 LAB: bounded, independent post-DELETE convergence.
 * This module only reads provider state; never performs any DELETE or SQL update.
 * Commit ownership DELETED only after TWO successful independent pairs:
 * paginated account inventory misses the exact owned script AND script GET is 404.
 */
const SAFE=/^cerebro-fact001-managed-lab-[a-z0-9]{4,20}$/;
export async function verifyFact001DeleteConvergenceLabV0({
 name,listScripts,getScriptStatus,pause=()=>Promise.resolve(),
 maxAttempts=5
}={}){
 if(typeof name!=='string'||!SAFE.test(name)||
    typeof listScripts!=='function'||typeof getScriptStatus!=='function'||
    typeof pause!=='function'||maxAttempts!==5)
  return {status:'NOT_VERIFIED',reason:'SCOPE_OR_DEPENDENCY_INVALID',provider_absent:false};
 let consecutive=0;
 for(let attempt=1;attempt<=5;attempt++){
  try{
   const scripts=await listScripts();
   if(!Array.isArray(scripts)||scripts.some(x=>!x||typeof x.id!=='string'))
    return {status:'NOT_VERIFIED',reason:'INVENTORY_INVALID',provider_absent:false,attempts:attempt};
   const inList=scripts.some(x=>x.id===name);
   const status=await getScriptStatus(name);
   if(!Number.isSafeInteger(status)||![200,404].includes(status))
    return {status:'NOT_VERIFIED',reason:'DIRECT_READ_UNVERIFIED',provider_absent:false,attempts:attempt};
   if(!inList&&status===404)consecutive++;
   else consecutive=0;
   if(consecutive===2)return {status:'CONFIRMED_ABSENT',provider_absent:true,attempts:attempt,
    consecutive_reads:2,prod_promotion_allowed:false};
   if(attempt<5)await pause(attempt*250);
  }catch{return {status:'NOT_VERIFIED',reason:'PROVIDER_READ_FAILED',provider_absent:false,attempts:attempt};}
 }
 return {status:'NOT_VERIFIED',reason:'POST_DELETE_CONVERGENCE_TIMEOUT',
  provider_absent:false,attempts:5,prod_promotion_allowed:false};
}
