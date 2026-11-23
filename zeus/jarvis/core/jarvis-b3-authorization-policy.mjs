/** ZEUS/JARVIS B3 authorization policy: explicit server grants, deny by default.
 * LAB-only pure evaluator. Never trust client roles, session flags or user metadata.
 */
export const HUMAN_REQUIRED_REASONS=Object.freeze([
 'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
 'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const id=(v)=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(v);
const denied=(reason)=>Object.freeze({decision:'DENY',reason});
const human=(reason)=>Object.freeze({decision:'HUMAN_REQUIRED',reason});
export function authorizeJarvisAction({principal,grant,action,context,now=Date.now(),killSwitch=false}={}){
 if(killSwitch===true)return denied('KILL_SWITCH');
 if(!principal||!id(principal.ownerId)||!id(principal.sessionId)||
    !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT'))return denied('AUTH_DENIED');
 if(!action||!id(action.name)||!context||!id(context.companyId)||!id(context.environment)||
    !['LAB','PREPROD','PROD'].includes(context.environment))return denied('CONTEXT_INVALID');
 if(!Array.isArray(principal.authorizedCompanies)||!principal.authorizedCompanies.includes(context.companyId))return denied('COMPANY_SCOPE_DENIED');
 if(!grant||grant.active!==true||grant.revoked===true||grant.ownerId!==principal.ownerId||
    grant.companyId!==context.companyId||grant.environment!==context.environment||
    !id(grant.grantId)||!Array.isArray(grant.actions)||!grant.actions.includes(action.name))return denied('GRANT_REQUIRED');
 if(!Number.isFinite(now)||!Number.isFinite(grant.expiresAt)||grant.expiresAt<=now)return denied('GRANT_EXPIRED');
 if(action.securityIncident===true)return human('SECURITY_INCIDENT');
 if(action.policyConflict===true)return human('POLICY_CONFLICT');
 if(action.legalRequired===true)return human('LEGAL_REQUIRED');
 if(action.signatureRequired===true)return human('SIGNATURE_REQUIRED');
 if(action.customerHumanRequest===true)return human('CUSTOMER_HUMAN_REQUEST');
 if(action.confidence!==undefined&&(!Number.isFinite(action.confidence)||action.confidence<0.9))return human('LOW_CONFIDENCE');
 if(action.highRisk===true)return human('HIGH_RISK');
 if(!Number.isFinite(action.estimatedCost)||action.estimatedCost<0)return denied('COST_INVALID');
 if(!Number.isFinite(grant.maxCost)||grant.maxCost<0||action.estimatedCost>grant.maxCost)return human('MONEY_LIMIT');
 if(action.mutating===true&&grant.allowMutations!==true)return human('HIGH_RISK');
 return Object.freeze({decision:'ALLOW',grantId:grant.grantId,ownerId:principal.ownerId,
   companyId:context.companyId,environment:context.environment,action:action.name});
}
