import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';
import {cerebroConsoleEndpoint} from './cerebroConsoleAccess';

const CEREBRO_SESSION_STORAGE_KEY='cerebro_console_session_id_v1';
let cerebroSessionIdMemory:string|null=null;

function createCerebroSessionId(){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
  if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function'){
    const bytes=new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
}

function cerebroConsoleSessionId(){
  if(cerebroSessionIdMemory)return cerebroSessionIdMemory;
  if(typeof window!=='undefined'){
    try{
      const existing=window.sessionStorage.getItem(CEREBRO_SESSION_STORAGE_KEY);
      if(existing&&existing.length>=16&&existing.length<=128){
        cerebroSessionIdMemory=existing;
        return existing;
      }
      const created=createCerebroSessionId();
      window.sessionStorage.setItem(CEREBRO_SESSION_STORAGE_KEY,created);
      cerebroSessionIdMemory=created;
      return created;
    }catch{/* fall through to in-memory id */}
  }
  cerebroSessionIdMemory=createCerebroSessionId();
  return cerebroSessionIdMemory;
}

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

export type CerebroPendingAction={
  action_id:string;
  action_type:string;
  engine_id:string;
  company_id:string;
  scope:Record<string,string>;
  summary:string;
  proposal_hash:string;
  proposal_issued_at:number;
  proposal_token:string;
};

export type CerebroReadContext={kind:"social_schedule";network:string;content_key?:string;external_post_id?:string|null;scheduled_at?:string;caption?:string;public_media_url?:string|null;media_urls?:string[]};

export type CerebroConversationTurn={
  role:'user'|'cerebro';
  text:string;
};

export type CerebroLearningCandidate={
  category:'voice_style'|'wording'|'pronunciation'|'response_length'|'interaction_preference'|'workflow_preference'|'business_preference';
  preference_key:string;
  value:string;
  label:string;
};

export type CerebroPreferences=Record<string,string>;

export type CerebroConsoleChatResponse={
  status:string;
  intent?:string;
  message:string;
  executed:boolean;
  reason?:string;
  available?:string[];
  action?:CerebroPendingAction;
  read_context?:CerebroReadContext;
  media?:{public_media_url?:string|null;media_urls?:string[]};
  learning_candidate?:CerebroLearningCandidate|null;
  preferences?:CerebroPreferences;
  context_applied?:boolean;
  resolved_question?:string;
  conversation_topic?:string|null;
};

async function authHeaders(){
  const {data:{session}}=await supabase.auth.getSession();
  const token=session?.access_token;
  if(!token)return null;
  // Keep a stable local Console session identity, but do not send it as a
  // cross-origin custom header until the Gateway CORS contract advertises it.
  // The current Gateway does not consume this value; conversation context is
  // carried explicitly in the chat payload.
  cerebroConsoleSessionId();
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

export async function postCerebroConsoleChat(message:string,pending_action:CerebroPendingAction|null=null,read_context:CerebroReadContext|null=null,learning_candidate:CerebroLearningCandidate|null=null,conversation_context:CerebroConversationTurn[]=[]):Promise<{status:number;data:CerebroConsoleChatResponse|null}>{
  const endpoint=cerebroConsoleEndpoint('chat');
  if(!endpoint)return{status:0,data:null};
  const headers=await authHeaders();
  if(!headers)return{status:401,data:null};
  try{
    const response=await fetch(endpoint,{
      method:'POST',
      headers,
      body:JSON.stringify({message,pending_action,read_context,learning_candidate,conversation_context}),
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

export async function fetchCerebroConsolePreferences():Promise<{status:number;data:{status?:string;preferences?:CerebroPreferences}|null}>{
  return fetchCerebroConsole<{status?:string;preferences?:CerebroPreferences}>('preferences');
}
