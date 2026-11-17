import type {FleetRead,FleetRun,FleetSource} from './cerebroFleetObserveApi';

/** Owner LAB read-only triage. Evidence from workflow samples is not runtime or agent health. */
export type TriagePriority='P1'|'P2';
export type TriageKind='WORKFLOW_FAILURE'|'WORKFLOW_ACTION_REQUIRED'|'CONNECTOR_NOT_VERIFIED';
export type TriageItem={
 key:string;kind:TriageKind;priority:TriagePriority;title:string;source:string;reason:string;
 observed_at:string|null;evidence_url:string|null;next_action:string;
 eta:'SIN_BASE_SUFICIENTE';cost:'NO_MEDIDO';scope:'RECENT_GITHUB_SAMPLE'|'CONNECTOR_OBSERVABILITY_GAP';
};
export type TriageResult={
 status:'READY_PARTIAL'|'UNAVAILABLE';reason:string;observed_at:string|null;
 verified_failure_count:number;needs_attention_count:number;unavailable_source_count:number;
 sampled_run_count:number;items:TriageItem[];executed:false;
};
const ageOK=(stamp:string|null|undefined,now:number,limitMs:number)=>{
 const value=typeof stamp==='string'?Date.parse(stamp):NaN;
 return Number.isFinite(value)&&value<=now+60000&&now-value<=limitMs;
};
const evidenceUrl=(run:FleetRun,source:FleetSource):string|null=>{
 const repo=source.repo;
 if(!repo||typeof run.url!=='string')return null;
 const prefix='https://github.com/'+repo+'/actions/runs/';
 return run.url.startsWith(prefix)&&/^\d+$/.test(run.url.slice(prefix.length))?run.url:null;
};
const safeLabel=(input:string|undefined|null)=>(input||'Sin nombre').slice(0,110).replace(/[\x00-\x1f]/g,' ').trim();

/**
 * Sufficient evidence: fresh owner snapshot, fresh source, a dated most recent
 * completed run for the same workflow, and a provider URL restricted to that repo.
 * Failed older runs are superseded by later success. A queued/in-progress run
 * is NOT evidence of a successful repair or failed execution.
 */
export function triageFleet(read:FleetRead,now=Date.now()):TriageResult{
 const blank=(reason:string):TriageResult=>({
  status:'UNAVAILABLE',reason,observed_at:null,verified_failure_count:0,
  needs_attention_count:0,unavailable_source_count:0,sampled_run_count:0,items:[],executed:false
 });
 if(read.kind!=='ready'||!read.snapshot)return blank(read.reason||'OWNER_FLEET_UNAVAILABLE');
 const snapshot=read.snapshot;
 if(snapshot.company_id!=='fenix'||snapshot.environment!=='LAB'||snapshot.verified_owner!==true||
    !ageOK(snapshot.observed_at,now,300000))return blank('OWNER_SCOPE_OR_SNAPSHOT_STALE');
 const items:TriageItem[]=[];
 let sampled=0,failed=0,attention=0,missing=0;
 for(const source of snapshot.sources){
  const name=safeLabel(source.name||source.repo||source.platform);
  if(source.state!=='LIVE'||!ageOK(source.observed_at,now,300000)){
   missing++;
   items.push({key:'conn:'+name,kind:'CONNECTOR_NOT_VERIFIED',priority:'P2',
    title:'Sin diagnóstico en vivo: '+name,source:name,
    reason:source.state==='LIVE'?'SOURCE_STALE':safeLabel(source.reason||'NO_VERIFIED_CONNECTOR'),
    observed_at:source.observed_at||null,evidence_url:null,
    next_action:'Comprobar conexión de solo lectura, permisos, alcance de empresa y frescura del proveedor; no concluir cero agentes ni ejecutar cambios.',
    eta:'SIN_BASE_SUFICIENTE',cost:'NO_MEDIDO',scope:'CONNECTOR_OBSERVABILITY_GAP'});
   continue;
  }
  if(source.platform!=='GitHub'||!Array.isArray(source.recent))continue;
  const latest=new Map<string,FleetRun>();
  for(const run of source.recent){
   if(!run||typeof run.name!=='string'||!ageOK(run.updated_at,now,7*86400000)||!evidenceUrl(run,source))continue;
   sampled++;
   if(run.status!=='completed')continue;
   const previous=latest.get(run.name);
   if(!previous||Date.parse(run.updated_at||'')>Date.parse(previous.updated_at||''))
    latest.set(run.name,run);
  }
  for(const [workflow,run] of latest){
   const kind:TriageKind=run.conclusion==='action_required'?'WORKFLOW_ACTION_REQUIRED':'WORKFLOW_FAILURE';
   if(!['failure','timed_out','startup_failure','action_required'].includes(run.conclusion||''))continue;
   if(kind==='WORKFLOW_FAILURE')failed++;else attention++;
   const url=evidenceUrl(run,source);
   items.push({key:'gh:'+source.repo+':'+run.run_id,kind,
    priority:kind==='WORKFLOW_FAILURE'?'P1':'P2',
    title:(kind==='WORKFLOW_FAILURE'?'Último resultado fallido':'Acción requerida')+': '+safeLabel(workflow),
    source:name,reason:'GITHUB_RUN_'+safeLabel(run.conclusion),
    observed_at:run.updated_at||null,evidence_url:url,
    next_action:'Inspeccionar logs y paso fallido del run '+run.run_id+', identificar causa y dependencias; reintentar solo mediante ejecutor autorizado con recibo.',
    eta:'SIN_BASE_SUFICIENTE',cost:'NO_MEDIDO',scope:'RECENT_GITHUB_SAMPLE'});
  }
 }
 items.sort((a,b)=>a.priority.localeCompare(b.priority)||a.title.localeCompare(b.title));
 return {status:'READY_PARTIAL',reason:'SAMPLED_GITHUB_PLUS_SOURCE_CONNECTIVITY_ONLY',
  observed_at:snapshot.observed_at,verified_failure_count:failed,needs_attention_count:attention,
  unavailable_source_count:missing,sampled_run_count:sampled,items:items.slice(0,15),executed:false};
}
