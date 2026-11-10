// FACT-001 · Single unresolved historical Notion root access probe.
// One fixed page, read-only, no caller-selectable ID, no page content returned.
export const FINAL_NOTION_ROOT_ID='1c381b1a-756d-81f3-9ac6-ec7ac66d4b1b';
export async function probeFinalNotionRoot({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('NOTION_SERVICE_TOKEN_DENIED');
 let response;
 try{response=await http('https://api.notion.com/v1/pages/'+FINAL_NOTION_ROOT_ID,{
  method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(9000)});
 }catch{return {status:'FACT001_FINAL_ROOT_INCONCLUSIVE',checked:1,accessible:0,denied:0,inconclusive:1,root_id:FINAL_NOTION_ROOT_ID,content_returned:false,write_operations:0,credentials_exposed:false};}
 if(response.status===401||response.status===403)throw Error('NOTION_GLOBAL_AUTH_DENIED_'+response.status);
 const access=response.status===200;
 return {status:access?'FACT001_FINAL_ROOT_ACCESS_VERIFIED':'FACT001_FINAL_ROOT_ACCESS_UNVERIFIED',
  scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},
  checked:1,accessible:access?1:0,denied:response.status===404?1:0,
  inconclusive:response.status===404||access?0:1,root_id:FINAL_NOTION_ROOT_ID,
  content_returned:false,write_operations:0,credentials_exposed:false};
}
