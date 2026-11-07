/** B3 trusted runtime guard. Inject server-only identity, inventory, grants and append-only audit adapters. */
import {authorizeJarvisAction} from './jarvis-b3-authorization-policy.mjs';
const denied=reason=>Object.freeze({decision:'DENY',reason});
const textId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(value);
export function createJarvisB3DecisionService({identityProvider,controlStore,grantStore,actionCatalog,auditStore}={}){
 if(typeof identityProvider?.verify!=='function'||typeof controlStore?.get!=='function'||
   typeof grantStore?.find!=='function'||typeof actionCatalog?.get!=='function'||
   typeof auditStore?.append!=='function')throw new TypeError('SERVER_ADAPTERS_REQUIRED');
 return Object.freeze({async authorize({token,companyId,environment,actionName}={}){
  if(typeof token!=='string'||!token.trim()||token.length>8192||!textId(companyId)||!['LAB','PREPROD','PROD'].includes(environment)||!textId(actionName))
   return denied('REQUEST_INVALID');
  let result=denied('AUTHORIZATION_UNAVAILABLE'),principal,control;
  try{
   principal=await identityProvider.verify(token);
   if(!textId(principal?.ownerId)||!textId(principal?.sessionId)||
      !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT'))
     result=denied('AUTH_DENIED');
   else if(!Array.isArray(principal.authorizedCompanies)||!principal.authorizedCompanies.includes(companyId))
     result=denied('COMPANY_SCOPE_DENIED');
   else{
    control=await controlStore.get({companyId,environment});
    if(!control||control.enabled!==true||control.killSwitch!==false)
     result=denied('KILL_SWITCH');
    else{
     const action=await actionCatalog.get(actionName);
     if(!action||action.name!==actionName)result=denied('ACTION_UNKNOWN');
     else{
      const grant=await grantStore.find({ownerId:principal.ownerId,companyId,environment,actionName});
      result=authorizeJarvisAction({principal,grant,action,context:{companyId,environment},killSwitch:false});
     }
    }
   }
  }catch{result=denied('AUTHORIZATION_UNAVAILABLE');}
  // Fail closed when central immutable audit cannot confirm recording. Never record tokens/credentials.
  try{
   const recorded=await auditStore.append({eventCode:result.decision,companyId,environment,
      grantId:result.grantId??null,allowed:result.decision==='ALLOW'});
   if(recorded!==true)return denied('AUDIT_UNAVAILABLE');
  }catch{return denied('AUDIT_UNAVAILABLE');}
  return result;
 }});
}
