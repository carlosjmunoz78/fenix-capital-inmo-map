/**
 * JARVIS user-interface continuity within one mounted SPA tab.
 * In-memory only: no localStorage, sessionStorage, cloud or persistent retention.
 * Does not carry pending approvals or action tokens across a workspace change.
 */
export type JarvisChatTurn={role:'user'|'cerebro';text:string;mediaUrl?:string|null};
type JarvisMemory={updatedAt:number;turns:JarvisChatTurn[]};
const cache=new Map<string,JarvisMemory>();
const ttlMs=4*60*60*1000;
const maxTurns=24;
const maxCharsPerTurn=1500;

function safeId(ownerId:string){
 return typeof ownerId==='string'&&/^[0-9a-f-]{24,64}$/i.test(ownerId);
}
export function recallJarvisConversation(ownerId:string,now=Date.now()):JarvisChatTurn[]{
 if(!safeId(ownerId))return[];
 const saved=cache.get(ownerId);
 if(!saved)return[];
 if(now-saved.updatedAt<0||now-saved.updatedAt>ttlMs){
  cache.delete(ownerId);return[];
 }
 return saved.turns.map(turn=>({...turn}));
}
export function rememberJarvisConversation(ownerId:string,turns:JarvisChatTurn[],now=Date.now()){
 if(!safeId(ownerId)||!Array.isArray(turns))return;
 const cleaned=turns.filter(turn=>turn&&(turn.role==='user'||turn.role==='cerebro')&&
  typeof turn.text==='string')
  .slice(-maxTurns).map(turn=>({
   role:turn.role,text:turn.text.slice(0,maxCharsPerTurn),
   mediaUrl:typeof turn.mediaUrl==='string'&&turn.mediaUrl.startsWith('https://')
    ?turn.mediaUrl.slice(0,2000):null
  }));
 cache.set(ownerId,{updatedAt:now,turns:cleaned});
 // Never retain history for other accounts in the same browser module.
 for(const id of cache.keys()){if(id!==ownerId)cache.delete(id)}
}
export function clearJarvisConversation(ownerId:string){
 if(safeId(ownerId))cache.delete(ownerId);
}
export function isJarvisConversationAvailable(ownerId:string,now=Date.now()){
 return recallJarvisConversation(ownerId,now).length>0;
}
export const JARVIS_UI_MEMORY_POLICY=Object.freeze({
 storage:'TAB_IN_MEMORY_ONLY',ttl_ms:ttlMs,max_turns:maxTurns,
 user_scoped:true,pending_actions_persist:false,client_secrets_persist:false
});
