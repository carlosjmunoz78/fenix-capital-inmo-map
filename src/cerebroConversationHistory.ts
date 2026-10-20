export type CerebroStoredLine={role:'user'|'cerebro';text:string;mediaUrl?:string|null};

export type CerebroStoredConversation={
 id:string;
 title:string;
 title_locked:boolean;
 created_at:string;
 updated_at:string;
 company_id:'fenix';
 engine_id:'CEREBRO-CONSOLE';
 environment:'LOCAL';
 version:'v1';
 lines:CerebroStoredLine[];
};

export const CEREBRO_CONVERSATIONS_CHANGED='cerebro-conversations-changed';
export const CEREBRO_CONVERSATION_SELECT='cerebro-conversation-select';

const STORAGE_KEY='cerebro_conversations_v1';
const ACTIVE_KEY='cerebro_active_conversation_v1';
const MAX_CONVERSATIONS=50;
const MAX_LINES=80;

function browserReady(){return typeof window!=='undefined'&&typeof window.localStorage!=='undefined'}
function nowIso(){return new Date().toISOString()}
function createId(){return `cerebro-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function cleanTitle(value:string){return value.replace(/\s+/g,' ').trim().slice(0,72)}
function autoTitle(lines:CerebroStoredLine[]){
 const first=lines.find(line=>line.role==='user'&&line.text.trim())?.text??'';
 const clean=cleanTitle(first);
 return clean?clean.length>=72?`${clean.slice(0,69)}…`:clean:'Nueva conversación';
}
function normalizeLine(value:unknown):CerebroStoredLine|null{
 if(!value||typeof value!=='object')return null;
 const raw=value as Record<string,unknown>;
 const role=raw.role==='user'||raw.role==='cerebro'?raw.role:null;
 const text=typeof raw.text==='string'?raw.text.trim():'';
 if(!role||!text)return null;
 return{role,text:text.slice(0,4000),mediaUrl:typeof raw.mediaUrl==='string'?raw.mediaUrl:null};
}
function normalizeConversation(value:unknown):CerebroStoredConversation|null{
 if(!value||typeof value!=='object')return null;
 const raw=value as Record<string,unknown>;
 const id=typeof raw.id==='string'&&raw.id.trim()?raw.id.trim():'';
 if(!id)return null;
 const lines=Array.isArray(raw.lines)?raw.lines.map(normalizeLine).filter((line):line is CerebroStoredLine=>Boolean(line)).slice(-MAX_LINES):[];
 const created=typeof raw.created_at==='string'&&raw.created_at?raw.created_at:nowIso();
 const updated=typeof raw.updated_at==='string'&&raw.updated_at?raw.updated_at:created;
 const title=cleanTitle(typeof raw.title==='string'?raw.title:'')||autoTitle(lines);
 return{id,title,title_locked:Boolean(raw.title_locked),created_at:created,updated_at:updated,company_id:'fenix',engine_id:'CEREBRO-CONSOLE',environment:'LOCAL',version:'v1',lines};
}
function readAll(){
 if(!browserReady())return[] as CerebroStoredConversation[];
 try{
  const parsed=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'[]');
  if(!Array.isArray(parsed))return[];
  return parsed.map(normalizeConversation).filter((item):item is CerebroStoredConversation=>Boolean(item)).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,MAX_CONVERSATIONS);
 }catch{return[]}
}
function notifyChanged(){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new CustomEvent(CEREBRO_CONVERSATIONS_CHANGED));
}
function writeAll(items:CerebroStoredConversation[]){
 if(!browserReady())return;
 try{
  const compact=items.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,MAX_CONVERSATIONS);
  window.localStorage.setItem(STORAGE_KEY,JSON.stringify(compact));
  notifyChanged();
 }catch{/* history is best effort and must never block chat */}
}
function newConversation():CerebroStoredConversation{
 const stamp=nowIso();
 return{id:createId(),title:'Nueva conversación',title_locked:false,created_at:stamp,updated_at:stamp,company_id:'fenix',engine_id:'CEREBRO-CONSOLE',environment:'LOCAL',version:'v1',lines:[]};
}

export function listCerebroConversations(){return readAll()}
export function getCerebroConversation(id:string){return readAll().find(item=>item.id===id)??null}
export function getActiveCerebroConversationId(){
 if(!browserReady())return'';
 try{return window.localStorage.getItem(ACTIVE_KEY)||''}catch{return''}
}
export function ensureActiveCerebroConversation(){
 const items=readAll();
 const activeId=getActiveCerebroConversationId();
 const current=items.find(item=>item.id===activeId);
 if(current)return current;
 const fallback=items[0];
 if(fallback){
  try{window.localStorage.setItem(ACTIVE_KEY,fallback.id)}catch{/* optional */}
  return fallback;
 }
 const created=newConversation();
 writeAll([created]);
 try{window.localStorage.setItem(ACTIVE_KEY,created.id)}catch{/* optional */}
 return created;
}
export function createCerebroConversation(){
 const created=newConversation();
 writeAll([created,...readAll()]);
 try{window.localStorage.setItem(ACTIVE_KEY,created.id)}catch{/* optional */}
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(CEREBRO_CONVERSATION_SELECT,{detail:{id:created.id}}));
 return created;
}
export function selectCerebroConversation(id:string){
 const target=getCerebroConversation(id);
 if(!target)return null;
 try{window.localStorage.setItem(ACTIVE_KEY,target.id)}catch{/* optional */}
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(CEREBRO_CONVERSATION_SELECT,{detail:{id:target.id}}));
 notifyChanged();
 return target;
}
export function renameCerebroConversation(id:string,title:string){
 const clean=cleanTitle(title);
 if(!clean)return null;
 const items=readAll();
 const index=items.findIndex(item=>item.id===id);
 if(index<0)return null;
 const next={...items[index],title:clean,title_locked:true,updated_at:nowIso()};
 items[index]=next;
 writeAll(items);
 return next;
}
export function persistCerebroConversation(id:string,lines:CerebroStoredLine[]){
 const safeLines=lines.map(normalizeLine).filter((line):line is CerebroStoredLine=>Boolean(line)).slice(-MAX_LINES);
 const items=readAll();
 const index=items.findIndex(item=>item.id===id);
 const base=index>=0?items[index]:newConversation();
 const next:CerebroStoredConversation={
  ...base,
  id,
  title:base.title_locked?base.title:autoTitle(safeLines),
  updated_at:nowIso(),
  lines:safeLines
 };
 if(index>=0)items[index]=next;else items.unshift(next);
 writeAll(items);
 return next;
}
