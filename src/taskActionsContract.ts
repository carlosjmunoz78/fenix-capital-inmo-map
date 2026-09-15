export type TaskBulkAction='complete'|'reopen'|'state'|'reassign';
export type TaskBulkItem={task_code:string;expected_version:number};
export type TaskBulkInput={items:TaskBulkItem[];action:TaskBulkAction;target_state?:string|null;new_actor_code?:string|null;comment?:string|null};
export type TaskBulkResponse={ok?:boolean;status?:number;error?:string;count?:number;items?:Array<{task_code:string;version:number;estado?:string;owner_actor_code?:string}>};
export type TaskBulkSender=(path:string,init:RequestInit)=>Promise<{status:number;data:TaskBulkResponse|null}>;

export function executeTaskBulkAction(send:TaskBulkSender,input:TaskBulkInput){
 return send('/tareas/actions',{method:'POST',body:JSON.stringify(input)});
}
