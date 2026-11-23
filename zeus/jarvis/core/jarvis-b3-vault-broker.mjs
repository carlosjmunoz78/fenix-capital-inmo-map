/** JARVIS B3 Vault Broker: credential reference never becomes a client-visible secret.
 * This broker is server-only; injected executor owns the Vault connection.
 */
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(value);
const denied=reason=>Object.freeze({status:'DENIED',reason});
export function createJarvisB3VaultBroker({decisionService,inventoryStore,credentialExecutor}={}){
 if(typeof decisionService?.authorize!=='function'||typeof inventoryStore?.get!=='function'||
    typeof credentialExecutor?.run!=='function')throw new TypeError('VAULT_SERVER_ADAPTERS_REQUIRED');
 return Object.freeze({async execute({token,companyId,environment,connectorId,actionName,parameters={}}={}){
  if(!id(companyId)||!id(connectorId)||!id(actionName)||!['LAB','PREPROD','PROD'].includes(environment))
   return denied('REQUEST_INVALID');
  if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))
   return denied('REQUEST_INVALID');
  let decision;
  try{decision=await decisionService.authorize({token,companyId,environment,actionName});}
  catch{return denied('AUTHORIZATION_UNAVAILABLE');}
  if(decision?.decision!=='ALLOW')return denied('AUTHORIZATION_DENIED');
  let credential;
  try{credential=await inventoryStore.get({companyId,environment,connectorId,actionName});}
  catch{return denied('VAULT_UNAVAILABLE');}
  if(!credential||credential.status!=='ACTIVE'||!id(credential.reference)||credential.companyId!==companyId||
     credential.connectorId!==connectorId||!Array.isArray(credential.allowedActions)||
     !credential.allowedActions.includes(actionName))return denied('VAULT_SCOPE_DENIED');
  // No plaintext credentials in this API; executor uses reference in trusted process.
  // Never include raw executor output in returned payload.
  try{
   const result=await credentialExecutor.run({credentialReference:credential.reference,companyId,
     connectorId,actionName,parameters:structuredClone(parameters)});
   if(result?.ok!==true||!id(result.evidenceId))return denied('EXECUTION_NOT_VERIFIED');
   return Object.freeze({status:'SUCCEEDED',evidenceId:result.evidenceId});
  }catch{return denied('EXECUTION_FAILED');}
 }});
}
