import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';
import {cerebroConsoleEndpoint} from './cerebroConsoleAccess';
import projectRegistryJson from '../cerebro/registry/jarvis-project-registry.v1.json';

export type JarvisProject={
  project_id:string;order:number;title:string;status:string;owner:string;editors:string[];
  autonomy_state:string;objective:string;subprojects:string[];dependencies:string[];audit_refs:string[];
  last_reconciled_at:string|null;source:string;
};
export type JarvisProjectOverlay=Partial<JarvisProject>&{project_id:string;is_user_created?:boolean;updated_at?:string;sort_order?:number};

type ApiResult<T>={status:number;data:T|null};
type ProjectResponse={status?:string;projects?:JarvisProject[];project?:JarvisProject;reason?:string};

const canonicalProjects=((projectRegistryJson as {projects?:JarvisProject[]}).projects||[]).map(project=>({...project}));
const canonicalById=new Map(canonicalProjects.map(project=>[project.project_id,project]));
const canonicalMaxOrder=canonicalProjects.reduce((max,project)=>Math.max(max,Number(project.order)||0),0);

function normalizeOverlay(overlay:JarvisProjectOverlay,index=0):JarvisProject{
  const base=canonicalById.get(overlay.project_id);
  return {
    project_id:overlay.project_id,
    order:Number(overlay.order??overlay.sort_order??base?.order??canonicalMaxOrder+1+index),
    title:String(overlay.title??base?.title??'Proyecto sin nombre'),
    status:String(overlay.status??base?.status??'PLANIFICADO'),
    owner:String(overlay.owner??base?.owner??'CARLOS'),
    editors:Array.isArray(overlay.editors)?overlay.editors.map(String):base?.editors??['CARLOS','JARVIS'],
    autonomy_state:String(overlay.autonomy_state??base?.autonomy_state??'ACTIVE'),
    objective:String(overlay.objective??base?.objective??''),
    subprojects:Array.isArray(overlay.subprojects)?overlay.subprojects.map(String):base?.subprojects??[],
    dependencies:Array.isArray(overlay.dependencies)?overlay.dependencies.map(String):base?.dependencies??[],
    audit_refs:Array.isArray(overlay.audit_refs)?overlay.audit_refs.map(String):base?.audit_refs??[],
    last_reconciled_at:overlay.last_reconciled_at??base?.last_reconciled_at??null,
    source:String(overlay.source??base?.source??(overlay.is_user_created?'JARVIS_PROJECT_HUB_V1':'CANONICAL_REGISTRY')),
  };
}

function mergeProjects(overlays:JarvisProjectOverlay[]){
  const overlaysById=new Map(overlays.map(item=>[item.project_id,item]));
  const merged=canonicalProjects.map(project=>normalizeOverlay({...project,...overlaysById.get(project.project_id)}));
  const userProjects=overlays.filter(item=>!canonicalById.has(item.project_id)).map((item,index)=>normalizeOverlay(item,index));
  return [...merged,...userProjects].sort((a,b)=>a.order-b.order||a.project_id.localeCompare(b.project_id));
}

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

export async function fetchJarvisProjects():Promise<ApiResult<ProjectResponse>>{
  const result=await call<{status?:string;projects?:JarvisProjectOverlay[];reason?:string}>('projects','GET');
  if(!result.data)return{status:result.status,data:null};
  return{status:result.status,data:{...result.data,projects:mergeProjects(Array.isArray(result.data.projects)?result.data.projects:[])}};
}

export async function createJarvisProject(input:{title:string;objective?:string;subprojects?:string[]}):Promise<ApiResult<ProjectResponse>>{
  const result=await call<{status?:string;project?:JarvisProjectOverlay;reason?:string}>('projects','POST',{project:input});
  if(!result.data?.project)return{status:result.status,data:result.data as ProjectResponse|null};
  return{status:result.status,data:{...result.data,project:normalizeOverlay(result.data.project)}};
}

export async function renameJarvisProject(projectId:string,title:string):Promise<ApiResult<ProjectResponse>>{
  const result=await call<{status?:string;project?:JarvisProjectOverlay;reason?:string}>(`projects/${encodeURIComponent(projectId)}`,'PATCH',{patch:{title}});
  if(!result.data?.project)return{status:result.status,data:result.data as ProjectResponse|null};
  return{status:result.status,data:{...result.data,project:normalizeOverlay(result.data.project)}};
}

export async function importJarvisProject(input:{title:string;objective?:string;subprojects?:string[];dependencies?:string[];source?:string}):Promise<ApiResult<ProjectResponse>>{
  const result=await call<{status?:string;project?:JarvisProjectOverlay;reason?:string}>('projects/import','POST',{project:input});
  if(!result.data?.project)return{status:result.status,data:result.data as ProjectResponse|null};
  return{status:result.status,data:{...result.data,project:normalizeOverlay(result.data.project)}};
}
