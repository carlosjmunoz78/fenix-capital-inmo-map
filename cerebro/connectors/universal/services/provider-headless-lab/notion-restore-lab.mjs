// FACT-001 Notion LAB: restore ONLY a previously created temporary child.
// This module is NOT routed from the deployed v10 broker. It performs no action
// without an explicitly supplied UUID and the independent service's Vault token.
// Restore is always followed by re-Trash, including ambiguous upstream failures.
import {WIKI_PAGE_ID,WIKI_TITLE,UPDATED_TITLE} from './notion-lifecycle.mjs';
const API='https://api.notion.com/v1/pages/';
const uuid=x=>typeof x==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(x);
const pageTitle=x=>x?.properties?.title?.title?.map(t=>t.plain_text??t.text?.content??'').join('')??'';
const trashed=x=>x?.in_trash===true||x?.archived===true;
async function request(http,token,method,id,body){
 if(!uuid(id)||!['GET','PATCH'].includes(method))throw Error('NOTION_RESTORE_BOUNDARY');
 const r=await http(API+id,{method,headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(14000)});
 if(r.status===401||r.status===403)throw Error('NOTION_RESTORE_AUTH_'+r.status);
 if(r.status!==200)throw Error('NOTION_RESTORE_HTTP_'+r.status);
 let result;try{result=await r.json();}catch{throw Error('NOTION_RESTORE_RESPONSE_INVALID');}
 if(result?.object!=='page'||result.id!==id)throw Error('NOTION_RESTORE_RESPONSE_INVALID');
 return result;
}
function assertOwned(x,id){
 if(x?.object!=='page'||x.id!==id||x.parent?.type!=='page_id'||x.parent?.page_id!==WIKI_PAGE_ID||pageTitle(x)!==UPDATED_TITLE)
  throw Error('NOTION_RESTORE_FOREIGN_OR_UNVERIFIED_CHILD');
}
export async function verifyNotionTrashedChildRestore({token,pageId,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('NOTION_RESTORE_TOKEN_INVALID');
 if(!uuid(pageId)||pageId===WIKI_PAGE_ID)throw Error('NOTION_RESTORE_PAGE_ID_DENIED');
 const parent=await request(http,token,'GET',WIKI_PAGE_ID);
 if(pageTitle(parent)!==WIKI_TITLE||trashed(parent))throw Error('NOTION_RESTORE_WIKI_UNVERIFIED');
 const original=await request(http,token,'GET',pageId);
 assertOwned(original,pageId);
 if(!trashed(original))throw Error('NOTION_RESTORE_SOURCE_NOT_IN_TRASH');
 let attempted=false,restored=false,cleanupVerified=false;
 try {
  attempted=true; // A network exception after PATCH can still have caused a write.
  const reply=await request(http,token,'PATCH',pageId,{in_trash:false});
  assertOwned(reply,pageId);
  const current=await request(http,token,'GET',pageId);
  assertOwned(current,pageId);
  if(trashed(current))throw Error('NOTION_RESTORE_NOT_VERIFIED');
  restored=true;
 }finally{
  if(attempted){
   // Never re-trash unless ownership, parent and title are independently rechecked.
   const current=await request(http,token,'GET',pageId);
   assertOwned(current,pageId);
   if(!trashed(current)){
    const reply=await request(http,token,'PATCH',pageId,{in_trash:true});
    assertOwned(reply,pageId);
   }
   const final=await request(http,token,'GET',pageId);
   assertOwned(final,pageId);
   cleanupVerified=trashed(final);
   if(!cleanupVerified)throw Error('NOTION_RESTORE_RETRASH_NOT_VERIFIED');
  }
 }
 if(!restored||!cleanupVerified)throw Error('NOTION_RESTORE_INCOMPLETE');
 return {status:'NOTION_LAB_RESTORE_AND_RETRASH_VERIFIED',provider:'notion',
  original_in_trash:true,restored:true,final_in_trash:true,
  wiki_modified:false,other_pages_modified:0,credentials_exposed:false};
}
