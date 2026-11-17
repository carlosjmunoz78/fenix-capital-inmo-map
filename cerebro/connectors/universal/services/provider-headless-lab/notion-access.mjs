// FACT-001 Notion service identity: read-only workspace visibility test.
// Notion /v1/search uses POST but has NO write effect. No content is returned.
export const NOTION_API='https://api.notion.com/v1/search';
export const NOTION_SECRET='cerebro_notion_service_token_v1';
export async function probeNotionWorkspace({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/[\s\r\n]/.test(token))
  throw Error('NOTION_SERVICE_CREDENTIAL_INVALID');
 const r=await http(NOTION_API,{
  method:'POST',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({page_size:50}),redirect:'error',signal:AbortSignal.timeout(12000)
 });
 if(r.status===401||r.status===403)throw Error('NOTION_SEARCH_PERMISSION_'+r.status);
 if(r.status!==200)throw Error('NOTION_SEARCH_HTTP_'+r.status);
 let obj;
 try{obj=await r.json()}catch{throw Error('NOTION_SEARCH_JSON_INVALID');}
 if(!Array.isArray(obj?.results)||typeof obj.has_more!=='boolean')throw Error('NOTION_SEARCH_RESPONSE_INVALID');
 if(obj.results.length>50)throw Error('NOTION_SEARCH_UNEXPECTED_LIMIT');
 const pages=obj.results.filter(x=>x?.object==='page').length;
 const databases=obj.results.filter(x=>x?.object==='database'||x?.object==='data_source').length;
 return {status:'NOTION_INDEPENDENT_WORKSPACE_READ',provider:'notion',accessible_objects_returned:obj.results.length,
   accessible_pages_returned:pages,accessible_databases_returned:databases,paginated:obj.has_more,
   has_accessible_objects:obj.results.length>0,write_operations:0,content_returned:false,credentials_exposed:false};
}
