// FACT001 Vercel LAB. The authenticated CEREBRO service is distinct from ChatGPT MCP.
export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'});
export const TEAM_ID='team_qnh6u1Ofy2WPp0MGEKlyMA50';
export const PROJECT_ID='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu';
export const PROJECT_NAME='cerebro-fact001-vercel-lab-20261111';
export const OPERATIONS=Object.freeze(['vercel.project.read_lab','vercel.project.set_framework_vite_lab','vercel.project.rollback_framework_null_lab','vercel.deployment.list_lab']);
export function validateOrder(j){
 if(!j||typeof j!=='object'||Array.isArray(j)||Object.entries(SCOPE).some(([k,v])=>j[k]!==v)||
 j.provider!=='vercel'||j.team_id!==TEAM_ID||j.project_id!==PROJECT_ID||j.project_name!==PROJECT_NAME||
 !OPERATIONS.includes(j.operation)||j.max_cost_eur!==0||!/^FACT001-VERCEL-[A-Z0-9-]{8,70}$/.test(j.request_id||'')||
 typeof j.idempotency_key!=='string'||!/^[a-z0-9-]{12,96}$/.test(j.idempotency_key))throw Error('VERCEL_LAB_SCOPE_DENIED');
 const names=['company_id','engine_id','environment','version','provider','team_id','project_id','project_name','operation','max_cost_eur','request_id','idempotency_key'];
 if(JSON.stringify(Object.keys(j).sort())!==JSON.stringify(names.sort()))throw Error('VERCEL_LAB_EXTRA_FIELDS_DENIED');
 return true;
}
