import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';
import {cerebroConsoleEndpoint} from './cerebroConsoleAccess';

export type JarvisProject={
  project_id:string;order:number;title:string;status:string;owner:string;editors:string[];
  autonomy_state:string;objective:string;subprojects:string[];dependencies:string[];audit_refs:string[];
  last_reconciled_at:string|null;source:string;
};

type ApiResult<T>={status:number;data:T|null};

async function headers(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return null;
  return {Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'};
}

async function call<T>(path:string,method:'GET'|'POST'|'PATCH',body?:unknown):Promise<ApiResult<T>>{
  const endpoint=cerebroConsoleEndpoint(path);
  const auth=await headers();
  if(!endpoint||!auth)return{status:endpoint?401:0,data:null};
  try{
    const response=await fetch(endpoint,{method,headers:auth,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    let data:T|null=null;try{data=await response.json() as T}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}

export async function fetchJarvisProjects(){
  return call<{status?:string;projects?:JarvisProject[]}>('projects','GET');
}

export async function createJarvisProject(input:{title:string;objective?:string;subprojects?:string[]}){
  return call<{status?:string;project?:JarvisProject;reason?:string}>('projects','POST',{project:input});
}

export async function renameJarvisProject(projectId:string,title:string){
  return call<{status?:string;project?:JarvisProject;reason?:string}>(`projects/${encodeURIComponent(projectId)}`,'PATCH',{patch:{title}});
}

export async function importJarvisProject(input:{title:string;objective?:string;subprojects?:string[];dependencies?:string[];source?:string}){
  return call<{status?:string;project?:JarvisProject;reason?:string}>('projects/import','POST',{project:input});
}
