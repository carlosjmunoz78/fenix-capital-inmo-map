// FACT-001 · Notion page creation parent gate (candidate, not deployed).
// A future CEREBRO-generated page MUST be created below a parent accessible to
// the independent CEREBRO integration. No root-level orphan pages; no ChatGPT
// OAuth fallback; no implied permissions from a title, URL, or user claim.
export const CEREBRO_INITIAL_NOTION_ROOT='1c481b1a-756d-8002-813d-f3efdd4ecd89'; // Wiki, verified in earlier LAB E2E
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
const scope=o=>o?.company_id==='fenix-capital'&&o?.engine_id==='FACT-001'&&o?.environment==='LAB'&&o?.version==='1.0.0'&&o?.client_id==='cerebro';
export function createNotionConnectedParentGate({registry,verifyServiceAccess}={}){
 if(registry?.durable!==true||typeof registry.get!=='function'||typeof verifyServiceAccess!=='function')
  throw Error('NOTION_PARENT_GATE_DEPENDENCIES_REQUIRED');
 return Object.freeze({async authorizeCreate(order){
  if(!scope(order)||order.operation!=='notion.page.create.child'||
     !uuid(order.parent_page_id)||typeof order.title!=='string'||order.title.length>96||
     !order.title.trim()||order.source!=='owner_order'||
     typeof order.request_id!=='string'||!/^FACT001-[A-Z0-9-]{10,80}$/.test(order.request_id)||
     Object.keys(order).some(k=>!['company_id','engine_id','environment','version','client_id','operation','source','request_id','parent_page_id','title'].includes(k)))
    return {authorized:false,reason:'ORDER_DENIED'};
  const parent=await registry.get(order.parent_page_id);
  if(parent?.page_id!==order.parent_page_id||parent?.company_id!=='fenix-capital'||
     parent?.environment!=='LAB'||parent?.owner_approved!==true||
     parent?.verified_with_independent_service!==true||parent?.connection_type!=='notion_internal_cerebro')
    return {authorized:false,reason:'PARENT_NOT_CONNECTED_OR_APPROVED'};
  let check;try{check=await verifyServiceAccess(order.parent_page_id);}
  catch{return {authorized:false,reason:'INDEPENDENT_SERVICE_ACCESS_UNVERIFIED'};}
  if(check?.accessible!==true||check?.id!==order.parent_page_id||
     check?.provider!=='notion'||check?.using_independent_credential!==true||
     check?.archived===true)return {authorized:false,reason:'INDEPENDENT_SERVICE_ACCESS_UNVERIFIED'};
  return {authorized:true,parent:{type:'page_id',page_id:order.parent_page_id},
   integration:'notion_internal_cerebro',scope:'fenix-capital/FACT-001/LAB/1.0.0',
   parent_verified:true,requires_extra_page_sharing:false,
   note:'Subpage inherits access from the approved connected parent. No top-level page is created.'};
 }});
}
