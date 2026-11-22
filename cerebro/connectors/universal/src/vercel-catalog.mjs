// FACT-001 Vercel LAB-only capability catalog; no PROD actions enabled.
export const VERCEL_TEAM_ID='team_qnh6u1Ofy2WPp0MGEKlyMA50';
export const VERCEL_LAB_PROJECT_ID='prj_vvil5epQ99mngK29vpLVOWmlVRP1';
export const VERCEL_LAB_PROJECT_NAME='cerebro-fact001-vercel-connector-lab-20261110';
const cap=(id,method,path,permission,status='IMPLEMENTED_LAB',sideEffect=false)=>({id,method,path,permission,status,sideEffect});
export const VERCEL_CAPABILITIES=Object.freeze([
 cap('vercel.projects.list','GET','/v10/projects','Projects Read'),
 cap('vercel.project.get','GET','/v9/projects/{project_id}','Projects Read'),
 cap('vercel.project.create-lab','POST','/v10/projects','Projects Write','IMPLEMENTED_LAB',true),
 cap('vercel.project.update-lab','PATCH','/v9/projects/{project_id}','Projects Write','IMPLEMENTED_LAB',true),
 cap('vercel.deployments.list','GET','/v6/deployments','Deployments Read'),
 cap('vercel.deployment.get','GET','/v13/deployments/{deployment_id}','Deployments Read'),
 cap('vercel.deployment.create-preview-lab','POST','/v13/deployments','Deployments Write','PARTIAL_NOT_ENABLED',true),
 cap('vercel.deployment.promote','POST','/v13/deployments/{deployment_id}/promote','Deployments Write','PLANNED_PROD_GATED',true),
 cap('vercel.deployment.rollback','POST','/v13/deployments/{deployment_id}/rollback','Deployments Write','PLANNED_PROD_GATED',true),
 cap('vercel.project.delete','DELETE','/v9/projects/{project_id}','Projects Write','PLANNED_PROD_GATED',true),
 cap('vercel.billing.manage','PATCH','/v1/billing','Billing Write','PLANNED_PROD_GATED',true)
]);
