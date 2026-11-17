/** LAB-only reversible modification of the ORIGINAL FACT-001 DELETE path.
 * Never runs provider I/O, uploads source, or touches other engines by itself.
 * Must verify exact live source SHA and expected deployed version separately.
 */
const IMPORT_ANCHOR="import {pagesTick} from './pages-adapter.mjs';";
const IMPORT="import {verifyFact001DeleteConvergenceLabV0} from './fact001-delete-readback-retry-lab.mjs';";
const OLD=" await api(token,'DELETE','/'+name);\n if((await list(token)).some(x=>x.id===name))throw Error('EXTERNAL_CHANGE_DETECTED');";
const NEW=[
 " await api(token,'DELETE','/'+name);",
 " const readback=await verifyFact001DeleteConvergenceLabV0({",
 "  name,listScripts:()=>list(token),",
 "  getScriptStatus:async candidate=>{",
 "   const response=await fetch(API+'/'+candidate,{method:'GET',",
 "    headers:{Authorization:'Bearer '+token,Accept:'application/json'},",
 "    redirect:'manual',signal:AbortSignal.timeout(9000)});",
 "   return response.status;",
 "  },",
 "  pause:ms=>new Promise(resolve=>setTimeout(resolve,ms))",
 " });",
 " if(readback.status!=='CONFIRMED_ABSENT')throw Error('EXTERNAL_CHANGE_DETECTED');"
].join('\n');
const count=(s,m)=>s.split(m).length-1;
export function patchFact001DeleteReadbackLabV0(source){
 if(typeof source!=='string'||count(source,IMPORT_ANCHOR)!==1||
   count(source,OLD)!==1||count(source,IMPORT)!==0||
   !source.includes("const PREFIX='cerebro-fact001-managed-lab-';")||
   !source.includes("async function remove(db,token,name,time)"))
  throw Error('FACT001_DELETE_BASELINE_DRIFT');
 const result=source.replace(IMPORT_ANCHOR,IMPORT_ANCHOR+'\n'+IMPORT)
  .replace(OLD,NEW);
 if(unpatchFact001DeleteReadbackLabV0(result)!==source)throw Error('FACT001_DELETE_NON_REVERSIBLE');
 return {source:result,old_delete_readback:'SINGLE_LIST',
  new_delete_readback:'TWO_CONSECUTIVE_LIST_AND_GET_404',max_attempts:5};
}
export function unpatchFact001DeleteReadbackLabV0(source){
 if(typeof source!=='string'||count(source,IMPORT)!==1||count(source,NEW)!==1)
  throw Error('FACT001_DELETE_CANDIDATE_DRIFT');
 return source.replace(IMPORT_ANCHOR+'\n'+IMPORT,IMPORT_ANCHOR).replace(NEW,OLD);
}
