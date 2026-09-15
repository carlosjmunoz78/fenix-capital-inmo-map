import {fetchAppApi,IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';
import {runTaskBulkAction} from './taskActionsRuntime';

export type OperationalResource='tareas'|'documentos'|'tasaciones'|'firmas';
export type ActionResult={status:number;data:any};

function unsupported(reason:string):ActionResult{
  return {status:409,data:{ok:false,status:409,error:'CANONICAL_WRITE_UNAVAILABLE',reason}};
}

async function legacyTestAction(resource:OperationalResource,id:string,changes:Record<string,unknown>):Promise<ActionResult>{
  const{data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return{status:401,data:null};
  try{
    const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-actions-test/${resource}/${encodeURIComponent(id)}/action`,{
      method:'POST',
      headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`},
      body:JSON.stringify({action:'update',changes})
    });
    let data:any=null;try{data=await r.json()}catch{}
    return{status:r.status,data};
  }catch{return{status:0,data:null}}
}

function expectedVersion(item:Record<string,unknown>|null|undefined){
  const raw=item?.version;
  return typeof raw==='number'&&Number.isFinite(raw)?raw:null;
}

async function prodTaskAction(id:string,item:Record<string,unknown>|null,changes:Record<string,unknown>):Promise<ActionResult>{
  const keys=Object.keys(changes);
  const version=expectedVersion(item);
  if(version===null)return unsupported('task_version_required');
  if(keys.length!==1)return unsupported('task_change_must_be_single_canonical_action');
  const key=keys[0];
  if(key==='id_trabajador_operativo'){
    const actor=String(changes[key]??'').trim();
    if(!actor)return unsupported('new_actor_code_required');
    return runTaskBulkAction({items:[{task_code:id,expected_version:version}],action:'reassign',new_actor_code:actor});
  }
  if(key==='estado'){
    const state=String(changes[key]??'').trim();
    if(!state)return unsupported('target_state_required');
    return runTaskBulkAction({items:[{task_code:id,expected_version:version}],action:'state',target_state:state});
  }
  if(key==='completada'){
    return runTaskBulkAction({items:[{task_code:id,expected_version:version}],action:changes[key]===true?'complete':'reopen'});
  }
  return unsupported(`task_field_not_mapped:${key}`);
}

async function prodAppraisalAction(id:string,item:Record<string,unknown>|null,changes:Record<string,unknown>):Promise<ActionResult>{
  const keys=Object.keys(changes);
  const version=expectedVersion(item);
  if(version===null)return unsupported('appraisal_version_required');
  if(keys.length!==1||keys[0]!=='estado')return unsupported('appraisal_only_status_is_mapped');
  const status=String(changes.estado??'').trim();
  if(!status)return unsupported('appraisal_status_required');
  return fetchAppApi(`/tasaciones/${encodeURIComponent(id)}/status`,{method:'POST',body:JSON.stringify({expected_version:version,status})});
}

export async function runOperationalRecordAction(resource:OperationalResource,id:string,item:Record<string,unknown>|null,changes:Record<string,unknown>):Promise<ActionResult>{
  if(!IS_PRODUCTION)return legacyTestAction(resource,id,changes);
  if(resource==='tareas')return prodTaskAction(id,item,changes);
  if(resource==='tasaciones')return prodAppraisalAction(id,item,changes);
  if(resource==='documentos')return unsupported('document_detail_write_requires_canonical_contract');
  if(resource==='firmas')return unsupported('signature_detail_write_requires_explicit_lifecycle_mapping');
  return unsupported('resource_not_mapped');
}
