// FACT-001 — one-off Notion service CRUD smoke. Only creates its own child under a
// fixed, explicitly shared wiki and moves the created child to Trash.
// NO mutation of pre-existing pages, databases, people, permissions or documents.
export const WIKI_PAGE_ID='1c481b1a-756d-8002-813d-f3efdd4ecd89';
export const WIKI_TITLE='Wiki Fénix Capital';
export const TEST_TITLE='FACT001 CEREBRO Notion LAB CRUD temporal 20261110';
export const UPDATED_TITLE=TEST_TITLE+' verificado';
const API='https://api.notion.com/v1';
const matchesUUID=x=>typeof x==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(x);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const titleText=x=>x?.properties?.title?.title?.map(t=>t.plain_text??t.text?.content??'').join('')||'';
const newTitle=title=>({title:[{text:{content:title}}]});
async function api(http,token,method,url,body){
 if(!url.startsWith(API+'/pages')||!['GET','POST','PATCH'].includes(method))throw Error('NOTION_BOUNDARY');
 const r=await http(url,{method,headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(14000)});
 if(r.status===401||r.status===403)throw Error('NOTION_LAB_AUTH_'+r.status);
 if(r.status===404)return {notFound:true};
 if(r.status!==200&&r.status!==201)throw Error('NOTION_LAB_HTTP_'+r.status);
 let obj;try{obj=await r.json();}catch{throw Error('NOTION_LAB_INVALID_JSON');}
 if(!isObject(obj))throw Error('NOTION_LAB_INVALID_BODY');
 return obj;
}
function assertChild(obj){
 if(obj?.object!=='page'||!matchesUUID(obj.id)||obj.parent?.type!=='page_id'||obj.parent?.page_id!==WIKI_PAGE_ID)throw Error('NOTION_LAB_FOREIGN_PAGE');
 if(![TEST_TITLE,UPDATED_TITLE].includes(titleText(obj)))throw Error('NOTION_LAB_TITLE_MISMATCH');
}
export async function verifyNotionLifeCycle({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/[\s\r\n]/.test(token))throw Error('NOTION_LAB_TOKEN_MISSING');
 const parent=await api(http,token,'GET',API+'/pages/'+WIKI_PAGE_ID);
 if(parent.notFound||parent.object!=='page'||parent.id!==WIKI_PAGE_ID||parent.in_trash===true||parent.archived===true||titleText(parent)!==WIKI_TITLE)throw Error('NOTION_LAB_WIKI_UNVERIFIED');
 let createdPage=null;let created=false,updated=false,archived=false,verified=false;
 try{
  const newPage=await api(http,token,'POST',API+'/pages',{
   parent:{type:'page_id',page_id:WIKI_PAGE_ID},
   properties:newTitle(TEST_TITLE)
  });
  assertChild(newPage);created=true;createdPage=newPage;
  const read=await api(http,token,'GET',API+'/pages/'+newPage.id);
  assertChild(read);
  const edited=await api(http,token,'PATCH',API+'/pages/'+newPage.id,{
   properties:newTitle(UPDATED_TITLE)
  });
  assertChild(edited);
  if(titleText(edited)!==UPDATED_TITLE)throw Error('NOTION_LAB_EDIT_NOT_VERIFIED');
  updated=true;createdPage=edited;
 }finally{
  if(createdPage?.id){
   // Never archive a pre-existing resource; only this exact API-created child.
   const before=await api(http,token,'GET',API+'/pages/'+createdPage.id);
   if(!before.notFound){
    assertChild(before);
    const result=await api(http,token,'PATCH',API+'/pages/'+createdPage.id,{in_trash:true});
    if(result?.in_trash!==true&&result?.archived!==true)throw Error('NOTION_LAB_TRASH_NOT_ACKNOWLEDGED');
    archived=true;
   }else archived=true;
   const final=await api(http,token,'GET',API+'/pages/'+createdPage.id);
   verified=final.notFound===true||final.in_trash===true||final.archived===true;
   if(!verified)throw Error('NOTION_LAB_TRASH_NOT_VERIFIED');
  }
 }
 if(!created||!updated||!archived||!verified)throw Error('NOTION_LAB_INCOMPLETE');
 return {status:'NOTION_LAB_CREATE_READ_UPDATE_TRASH_VERIFIED',parent_verified:true,
  created:true,read:true,updated:true,trashed:true,verified_trash:true,
  existing_wiki_content_modified:false,other_pages_modified:0,api_writes:3,
  credentials_exposed:false,temporary_page_in_trash:true};
}
