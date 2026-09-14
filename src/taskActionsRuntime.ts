import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

export type TaskBulkAction='complete'|'reopen'|'state'|'reassign';
export type TaskBulkItem={task_code:string;expected_version:number};
export type TaskBulkResponse={ok?:boolean;status?:number;error?:string;count?:number;items?:Array<{task_code:string;version:number;estado?:string;owner_actor_code?:string}>};

export async function runTaskBulkAction(input:{items:TaskBulkItem[];action:TaskBulkAction;target_state?:string|null;new_actor_code?:string|null;comment?:string|null}):Promise<{status:number;data:TaskBulkResponse|null}>{
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null};
 try{
  const response=await fetch(`${SUPABASE_URL}/functions/v1/fenix-task-actions`,{
   method:'POST',
   headers:{'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},
   body:JSON.stringify(input)
  });
  let data:TaskBulkResponse|null=null;try{data=await response.json()}catch{}
  return{status:response.status,data};
 }catch{return{status:0,data:null};}
}
