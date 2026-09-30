import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';
import {cerebroConsoleEndpoint} from './cerebroConsoleAccess';

export type CerebroConsoleHealth={
  status?:string;
  service?:string;
  environment?:string;
  version?:string;
  authenticated_transport?:boolean;
  direct_model_access?:boolean;
  prod_execution_enabled?:boolean;
  live_writes?:boolean;
  chat_available?:boolean;
  chat_mode?:string;
};

export type CerebroConsoleChatResponse={
  status:string;
  intent?:string;
  message:string;
  executed:boolean;
  reason?:string;
  available?:string[];
};

async function authHeaders(){
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return null;
  return{
    Authorization:`Bearer ${token}`,
    apikey:SUPABASE_PUBLISHABLE_KEY,
    'content-type':'application/json'
  };
}

export async function fetchCerebroConsole<T>(path:string):Promise<{status:number;data:T|null}>{
  const endpoint=cerebroConsoleEndpoint(path);
  if(!endpoint)return{status:0,data:null};
  const headers=await authHeaders();
  if(!headers)return{status:401,data:null};
  try{
    const response=await fetch(endpoint,{method:'GET',headers,cache:'no-store'});
    let data:T|null=null;
    try{data=await response.json() as T}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}

export async function postCerebroConsoleChat(message:string):Promise<{status:number;data:CerebroConsoleChatResponse|null}>{
  const endpoint=cerebroConsoleEndpoint('chat');
  if(!endpoint)return{status:0,data:null};
  const headers=await authHeaders();
  if(!headers)return{status:401,data:null};
  try{
    const response=await fetch(endpoint,{
      method:'POST',
      headers,
      body:JSON.stringify({message}),
      cache:'no-store'
    });
    let data:CerebroConsoleChatResponse|null=null;
    try{data=await response.json() as CerebroConsoleChatResponse}catch{data=null}
    return{status:response.status,data};
  }catch{return{status:0,data:null}}
}

export function fetchCerebroConsoleHealth(){
  return fetchCerebroConsole<CerebroConsoleHealth>('health');
}
