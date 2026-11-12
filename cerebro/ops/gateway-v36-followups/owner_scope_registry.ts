/**
 * OWNER_SCOPE_REGISTRY_V0 — pure, non-operational discovery adapter.
 * This module does not grant permissions, query tenants or execute operations.
 * Input arrays MUST be supplied by a trusted server-side registry loader *after*
 * authorizedOwner() and membership/tenancy checks. Never pass browser data here.
 * The empty PREPROD Company Registry must NOT be mistaken for global connectivity.
 */
const SAFE_ID=/^[a-z0-9][a-z0-9_-]{0,79}$/;
const normalizeId=value=>typeof value==="string"?value.trim().toLowerCase():"";
function safeRegisteredEntry(item){
 if(!item||typeof item!=="object"||Array.isArray(item))return null;
 const company_id=normalizeId(item.company_id);
 if(!SAFE_ID.test(company_id))return null;
 // Registry metadata is not an authorization to query App/CRM or deploy.
 return {
  company_id,
  environment:String(item.environment||"PREPROD").slice(0,24),
  registry_state:String(item.state||"UNKNOWN").slice(0,48),
  prod_authorized:item.prod_authorized===true,
  prod_write_authorized:item.prod_write_authorized===true,
  access_status:"REGISTRY_PRESENT_INTEGRATION_UNVERIFIED"
 };
}
function safeProjectEntry(item,registeredCompanyIds){
 if(!item||typeof item!=="object"||Array.isArray(item))return null;
 const company_id=normalizeId(item.company_id);
 const project_id=normalizeId(item.project_id);
 if(!SAFE_ID.test(project_id)||!registeredCompanyIds.has(company_id))return null;
 return {
  company_id,project_id,
  environment:String(item.environment||"PREPROD").slice(0,24),
  access_status:"PROJECT_RECORD_PRESENT_INTEGRATION_UNVERIFIED"
 };
}
/**
 * Returns scope metadata without customer records, secrets, or effective grants.
 * Server must verify identity and registry source; a query-string company_id can
 * filter the result but cannot add a company or project to the result set.
 */
export function listOwnerRegisteredScopes({
 actor,serverSourceVerified=false,companyRecords=[],projectRecords=[],
 requestedCompany="all",requestedProject=null
}={}){
 if(actor!=="CARLOS-ADMIN")return {status:"FORBIDDEN",reason:"OWNER_ONLY",executed:false};
 if(serverSourceVerified!==true)return {
   status:"SOURCE_UNVERIFIED",reason:"TRUSTED_REGISTRY_REQUIRED",executed:false,companies:[],projects:[]
 };
 const companies=[...new Map((Array.isArray(companyRecords)?companyRecords:[])
   .map(safeRegisteredEntry).filter(Boolean).map(x=>[x.company_id,x])).values()];
 const ids=new Set(companies.map(x=>x.company_id));
 const projects=[...new Map((Array.isArray(projectRecords)?projectRecords:[])
   .map(x=>safeProjectEntry(x,ids)).filter(Boolean).map(x=>[x.company_id+"/"+x.project_id,x])).values()];
 const company=normalizeId(requestedCompany);
 const project=normalizeId(requestedProject);
 if(company && company!=="all" && company!=="todas" && !ids.has(company))return {
   status:"NOT_CONNECTED",reason:"COMPANY_NOT_IN_VERIFIED_REGISTRY",executed:false,companies:[],projects:[]
 };
 const chosenCompanies=companies.filter(x=>!company||company==="all"||company==="todas"||x.company_id===company);
 const chosenIds=new Set(chosenCompanies.map(x=>x.company_id));
 const chosenProjects=projects.filter(x=>chosenIds.has(x.company_id)&&(!project||x.project_id===project));
 if(project&&!chosenProjects.length)return {
   status:"NOT_CONNECTED",reason:"PROJECT_NOT_IN_VERIFIED_COMPANY_SCOPE",executed:false,
   companies:chosenCompanies,projects:[]
 };
 return {
   status:"OK",contract:"OWNER_SCOPE_REGISTRY_V0",executed:false,data_returned:false,
   access_granted:false,source_status:"SERVER_REGISTRY_METADATA_ONLY",
   companies:chosenCompanies,projects:chosenProjects,
   message:"El registro permite descubrir empresas/proyectos nuevos sin escribir IDs en las interfaces, pero no certifica acceso operativo a sus recursos."
 };
}
