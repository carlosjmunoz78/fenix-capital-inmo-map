// FACT-001 Supabase Management API, bounded admin action. Never grant DB core mutation from an LLM argument.
export const SUPABASE_PROJECT_REF='cluhljgonannaafpmblx';
export const DISPOSABLE_FUNCTION='cerebro-fact001-vercel-service-lab';
export const DISPOSABLE_FUNCTION_ID='f004e7f1-4911-440d-8809-c656f5f89b38';
const c=(id,method,path,permission,status='IMPLEMENTED_LAB',sideEffect=false)=>({id,method,path,permission,status,sideEffect});
export const SUPABASE_ADMIN_CAPABILITIES=Object.freeze([
 c('supabase-admin.edge-functions.list','GET','/v1/projects/{ref}/functions','edge_functions_read'),
 c('supabase-admin.edge-functions.get','GET','/v1/projects/{ref}/functions/{slug}','edge_functions_read'),
 c('supabase-admin.edge-functions.delete-test-tombstone','DELETE','/v1/projects/{ref}/functions/{slug}','edge_functions_write','IMPLEMENTED_LAB',true),
 c('supabase-admin.edge-functions.deploy','POST','/v1/projects/{ref}/functions/deploy','edge_functions_write','PARTIAL_NOT_ENABLED',true),
 c('supabase-admin.edge-functions.delete-arbitrary','DELETE','/v1/projects/{ref}/functions/{slug}','edge_functions_write','PLANNED_PROD_GATED',true),
 c('supabase-admin.projects.delete','DELETE','/v1/projects/{ref}','project_settings_write','PLANNED_PROD_GATED',true)
]);
