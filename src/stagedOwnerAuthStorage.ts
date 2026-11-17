/**
 * Stage-only auth storage. Non-remembered sessions belong to the current tab.
 * Opening a new tab must not invoke signOut and revoke another tab's token.
 * The production app keeps its existing, unchanged auth storage behavior.
 */
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createStagedOwnerAuthStorage(local:Store, tab:Store, authKey:string){
 const remembered=()=>local.getItem('fenix-remember-device')==='true';
 const active=()=>tab.getItem('fenix-session-active')==='1';
 return {
  getItem(key:string):string|null{
   if(key!==authKey)return local.getItem(key);
   if(remembered())return local.getItem(key);
   // No tab authorization marker means the tab cannot resume this session.
   if(!active())return null;
   const current=tab.getItem(key);
   if(current!==null)return current;
   // One-time migration ONLY for a tab that was authenticated before this fix.
   // Never inherit its token in an unrelated new tab.
   if(active()){
    const legacy=local.getItem(key);
    if(legacy!==null){
     tab.setItem(key,legacy);
     local.removeItem(key);
     return legacy;
    }
   }
   return null;
  },
  setItem(key:string,value:string):void{
   if(key!==authKey){local.setItem(key,value);return;}
   if(remembered()){
    local.setItem(key,value);
    tab.removeItem(key);
   }else{
    tab.setItem(key,value);
    // Keep non-remembered tokens out of persistent storage.
    if(active())local.removeItem(key);
   }
  },
  removeItem(key:string):void{
   if(key!==authKey){local.removeItem(key);return;}
   tab.removeItem(key);
   // Do not delete/revoke a distinct tab's persisted legacy session on
   // startup of a tab which never authenticated in this browser session.
   if(remembered()||active())local.removeItem(key);
  }
 };
}
