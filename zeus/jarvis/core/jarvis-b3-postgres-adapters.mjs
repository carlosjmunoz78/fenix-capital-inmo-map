/** Server-only B3 adapters to private zeus_jarvis Postgres schema.
 * The injected query function MUST use parameter bindings and a dedicated trusted connection.
 * Neither passwords nor decrypted Vault values are queried by this module.
 */
const one=async(query,sql,args)=>{const result=await query(sql,args);return result?.rows?.[0]??null};
const key=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(value);
export function createJarvisB3PostgresAdapters({query}={}){
 if(typeof query!=='function')throw new TypeError('TRUSTED_POSTGRES_QUERY_REQUIRED');
 const controlStore={async get({companyId,environment}){
  const row=await one(query,'SELECT enabled,kill_switch FROM zeus_jarvis.b3_runtime_control WHERE company_id=$1 AND environment=$2',[companyId,environment]);
  return row?{enabled:row.enabled===true,killSwitch:row.kill_switch===true}:null;
 }};
 const grantStore={async find({ownerId,companyId,environment,actionName}){
  const row=await one(query,'SELECT grant_id,owner_id,company_id,environment,actions,extract(epoch from expires_at)*1000 AS expires_at_ms,max_cost_eur,allow_mutations,active,revoked FROM zeus_jarvis.b3_owner_grants WHERE owner_id=$1 AND company_id=$2 AND environment=$3 AND $4=ANY(actions) ORDER BY issued_at DESC LIMIT 1',[ownerId,companyId,environment,actionName]);
  if(!row)return null;
  return {grantId:row.grant_id,ownerId:row.owner_id,companyId:row.company_id,environment:row.environment,
   actions:row.actions,expiresAt:Number(row.expires_at_ms),maxCost:Number(row.max_cost_eur),
   allowMutations:row.allow_mutations===true,active:row.active===true,revoked:row.revoked===true};
 }};
 const inventoryStore={async get({companyId,environment,connectorId,actionName}){
  const row=await one(query,'SELECT company_id,connector_id,status,vault_secret_id,allowed_actions FROM zeus_jarvis.b3_secret_inventory WHERE company_id=$1 AND environment=$2 AND connector_id=$3 AND $4=ANY(allowed_actions) LIMIT 1',[companyId,environment,connectorId,actionName]);
  return row?{companyId:row.company_id,connectorId:row.connector_id,status:row.status,
    reference:row.vault_secret_id,allowedActions:row.allowed_actions}:null;
 }};
 const auditStore={async append({eventCode,companyId,environment,grantId,allowed}){
  if(!key(eventCode)||!key(companyId)||!['LAB','PREPROD','PROD'].includes(environment)||typeof allowed!=='boolean')
   return false;
  const row=await one(query,'INSERT INTO zeus_jarvis.b3_audit_events(event_code,company_id,environment,grant_id,allowed) VALUES($1,$2,$3,$4,$5) RETURNING audit_id',[eventCode,companyId,environment,grantId??null,allowed]);
  return Number.isSafeInteger(Number(row?.audit_id));
 }};
 return Object.freeze({controlStore,grantStore,inventoryStore,auditStore});
}
