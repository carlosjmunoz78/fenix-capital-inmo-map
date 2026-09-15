import {fetchAppApi} from './supabase';

export type TaskBulkAction='complete'|'reopen'|'state'|'reassign';
export type TaskBulkItem={task_code:string;expected_version:number};
export type TaskBulkResponse={ok?:boolean;status?:number;error?:string;count?:number;items?:Array<{task_code:string;version:number;estado?:string;owner_actor_code?:string}>};

function unsupported(reason:string):{status:number;data:TaskBulkResponse}{
 return {status:409,data:{ok:false,status:409,error:`CANONICAL_WRITE_UNAVAILABLE:${reason}`}};
}

export async function runTaskBulkAction(input:{items:TaskBulkItem[];action:TaskBulkAction;target_state?:string|null;new_actor_code?:string|null;comment?:string|null}):Promise<{status:number;data:TaskBulkResponse|null}>{
 if(input.items.length!==1)return unsupported('task_gateway_requires_single_item');
 const item=input.items[0];
 if(!item?.task_code||!Number.isFinite(item.expected_version))return unsupported('task_code_and_expected_version_required');
 if(input.action!=='reassign')return unsupported(`task_action_not_mapped:${input.action}`);
 const actor=String(input.new_actor_code??'').trim();
 if(!actor)return unsupported('new_actor_code_required');
 return fetchAppApi<TaskBulkResponse>(`/tareas/${encodeURIComponent(item.task_code)}/reassign`,{
  method:'POST',
  body:JSON.stringify({new_actor_code:actor,expected_version:item.expected_version})
 });
}
