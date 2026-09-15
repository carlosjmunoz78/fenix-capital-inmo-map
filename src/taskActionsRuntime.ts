import {fetchAppApi} from './supabase';
import {executeTaskBulkAction,type TaskBulkInput} from './taskActionsContract';
export type {TaskBulkAction,TaskBulkItem,TaskBulkResponse} from './taskActionsContract';

export async function runTaskBulkAction(input:TaskBulkInput){
 return executeTaskBulkAction(fetchAppApi,input);
}
