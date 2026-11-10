// FACT-001 · Future Notion child-page preflight using the user's connected Wiki.
// Versioned approved parent registry lives in Git (PR #44); independent service
// rechecks Notion before EACH creation. No Notion POST /pages in this module.
// This is a LAB planning gate, NOT an autonomous writer.
import {createNotionConnectedParentGate,CEREBRO_INITIAL_NOTION_ROOT} from './notion-connected-parent-gate.mjs';
const API='https://api.notion.com/v1/pages/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const parentRegistry=Object.freeze({
  source:'FACT001_GIT_VERSIONED_VERIFIED_PARENT_20261110',
  durable:true,
  async get(id){
   // Approve only the Wiki root for automatic LAB child generation. Other
   // 57 verified resources are readable but NOT inferred write destinations.
   if(id!==CEREBRO_INITIAL_NOTION_ROOT)return null;
   return {page_id:id,company_id:'fenix-capital',environment:'LAB',
    owner_approved:true,verified_with_independent_service:true,
    connection_type:'notion_internal_cerebro'};
  }
});
export async function planNotionConnectedLabChild({token,order,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))
  throw Error('NOTION_SERVICE_TOKEN_DENIED');
 let reads=0;
 const verifyServiceAccess=async id=>{
  if(id!==CEREBRO_INITIAL_NOTION_ROOT||!UUID.test(id))throw Error('NOTION_PARENT_DENIED');
  reads++;
  let r;
  try{r=await http(API+id,{method:'GET',headers:{
   Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'
  },redirect:'error',signal:AbortSignal.timeout(9000)});}
  catch{throw Error('NOTION_PARENT_NETWORK_UNVERIFIED');}
  if(r.status!==200)throw Error('NOTION_PARENT_HTTP_'+r.status);
  let page;try{page=await r.json();}catch{throw Error('NOTION_PARENT_RESPONSE_INVALID');}
  if(page?.object!=='page'||page.id!==id||page.in_trash===true||page.archived===true)
   throw Error('NOTION_PARENT_NOT_LIVE');
  return {accessible:true,id,provider:'notion',using_independent_credential:true,archived:false};
 };
 const gate=createNotionConnectedParentGate({registry:parentRegistry,verifyServiceAccess});
 const result=await gate.authorizeCreate(order);
 return {status:result.authorized?'CONNECTED_PARENT_PLAN_VERIFIED':'CONNECTED_PARENT_PLAN_BLOCKED',
  authorized:result.authorized,reason:result.authorized?null:result.reason,
  connected_parent_id:result.authorized?CEREBRO_INITIAL_NOTION_ROOT:null,
  scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},
  provider:'notion',independent_service_rechecked:result.authorized&&reads===1,
  creation_executed:false,write_operations:0,
  inherited_connection_expected:result.authorized,
  note:'Subpages of a parent with CEREBRO integration inherit access; still require write gate and readback.'};
}
