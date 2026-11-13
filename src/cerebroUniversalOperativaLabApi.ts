/** Operativa-only LAB preview reader: never alters canonical chat/voice or PROD source. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';

const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-326d86-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
export type UniversalLabCapability={
 company_id:string;engine_id:string;environment:'LAB';version:string;capability_id:string;
 policy:string;side_effects:string;executor:string;health:string
};
type CapResponse={
 status:string;source:string;transport?:string;
 capabilities?:UniversalLabCapability[];prod_execution_enabled?:boolean
};
type SummaryResponse={
 status:string;result?:{engine_registry_count:number;operational_engine_count:string;source:string}
};
export function canPreviewUniversalOperativa(location:Pick<Location,'hostname'|'search'>):boolean{
 return HOST.test(location.hostname.toLowerCase())
  &&new URLSearchParams(location.search).get('visual_lab')==='cockpit-v3'
  &&new URLSearchParams(location.search).get('section')==='operativa';
}
export type UniversalLabProof={
 kind:'ready'|'unavailable'|'denied';
 capabilities:UniversalLabCapability[];
 registeredDefinitions:number|null;
 operationalState:string;
 source:string;
};
export async function readUniversalOperativaLab(signal?:AbortSignal):Promise<UniversalLabProof>{
 const unavailable=(kind:'unavailable'|'denied'):UniversalLabProof=>({
  kind,capabilities:[],registeredDefinitions:null,operationalState:'NO_VERIFICADO',source:'SIN_EVIDENCIA_LIVE'
 });
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))return unavailable('denied');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return unavailable('denied');
 const endpoint=new URL('/api/cerebro-universal-preview',window.location.origin);
 const call=async(action:'list_capabilities'|'invoke_read',extra:Record<string,unknown>={})=>{
  const response=await fetch(endpoint.href,{
   method:'POST',signal,cache:'no-store',
   headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},
   body:JSON.stringify({action,params:{company_id:'fenix',environment:'LAB',...extra}})
  });
  if(response.status===401||response.status===403)throw Error('DENIED');
  if(response.status!==200)throw Error('UNAVAILABLE');
  return response.json() as Promise<unknown>;
 };
 try{
  const raw=await call('list_capabilities');
  if(!raw||typeof raw!=='object')return unavailable('unavailable');
  const r=raw as CapResponse;
  if(r.status!=='OK'||r.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||r.prod_execution_enabled!==false||!Array.isArray(r.capabilities))
   return unavailable('unavailable');
  const caps=r.capabilities.filter(c=>c&&c.company_id==='fenix'&&c.environment==='LAB'&&
   c.policy==='READ_ONLY'&&c.side_effects==='NONE'&&c.engine_id==='FACT-001'&&c.capability_id==='fact.registry.summary');
  if(caps.length!==1)return unavailable('unavailable');
  const response=await call('invoke_read',{capability_id:'fact.registry.summary'});
  const parsed=response as SummaryResponse;
  const count=parsed?.result?.engine_registry_count;
  if(parsed?.status!=='READ_EXECUTED'||!Number.isSafeInteger(count)||count!==179||
    parsed?.result?.operational_engine_count!=='NOT_VERIFIED')
   return unavailable('unavailable');
  return {kind:'ready',capabilities:caps,registeredDefinitions:count,
   operationalState:'NO_VERIFICADO',source:'FACT-001 · REPOSITORIO LAB'};
 }catch(error){
  if(signal?.aborted)return unavailable('unavailable');
  return unavailable(error instanceof Error&&error.message==='DENIED'?'denied':'unavailable');
 }
}
