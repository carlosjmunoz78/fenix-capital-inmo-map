/** CEREBRO OS · PC-001 PREPROD · owner-authenticated health canary only.
 * No desktop control, app changes, browser automation, shell, payments or PROD.
 * Pure data; external authorization and database writes remain server-owned.
 */
export const PC001_HEALTH_CANARY_V0 = Object.freeze({
  company_id:'fenix', venture_id:'fenix',engine_id:'PC-001',
  environment:'PREPROD',version:'pc001-windows-v1',
  device_id:'78ca78cf158b3cda329cf39e0270f0a5',
  capability:'SERVICE_HEALTH',action:'READ_HEALTH',
  policy_id:'pc001-readonly-preprod-v1',
  confirmation:'AUTORIZO_PC001_READ_HEALTH_PREPROD_UNA_VEZ',
  endpoint_version:'0.1.0',max_age_ms:180000,ttl_ms:480000,rate_limit_ms:600000
});
function plain(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&(Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);}
export const REQUEST_ID_RE=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export function validateHealthOwnerRequest(body){
  const c=PC001_HEALTH_CANARY_V0;
  if(!plain(body))return {ok:false,code:'REQUEST_OBJECT_REQUIRED'};
  const keys=Object.keys(body);
  if(keys.length!==4||keys.some(k=>!['request_id','device_id','action','confirmation'].includes(k)))return {ok:false,code:'EXACT_FIELDS_REQUIRED'};
  if(typeof body.request_id!=='string'||!REQUEST_ID_RE.test(body.request_id))return {ok:false,code:'UUID_REQUIRED'};
  if(body.device_id!==c.device_id||body.action!==c.action)return {ok:false,code:'DEVICE_OR_ACTION_DENIED'};
  if(body.confirmation!==c.confirmation)return {ok:false,code:'EXACT_OWNER_CONFIRMATION_REQUIRED'};
  return {ok:true,request_id:body.request_id.toLowerCase()};
}
export function validateTrustedOwnerContext(actor){
  return plain(actor)&&actor.authenticated===true&&actor.actor_code==='CARLOS-ADMIN'&&actor.role==='Direccion'&&actor.active===true;
}
export function validateLivePc001Device(row,now=new Date()){
  const c=PC001_HEALTH_CANARY_V0;
  if(!plain(row)||row.device_id!==c.device_id||row.company_id!==c.company_id||row.environment!==c.environment||row.version!==c.version||row.status!=='ONLINE'||row.revoked_at!==null)return {ok:false,code:'DEVICE_SCOPE_OR_STATE_DENIED'};
  const last=Date.parse(row.last_seen_at),timestamp=now.getTime();
  if(!Number.isFinite(last)||last>timestamp+10000||timestamp-last>c.max_age_ms)return {ok:false,code:'HEARTBEAT_NOT_FRESH'};
  return {ok:true};
}
export async function stableHashText(text){
  if(typeof text!=='string'||text.length===0)throw Error('HASH_INPUT_REQUIRED');
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function buildOwnerHealthCanaryRow({request_id,auth_user_id,now=new Date()}={}){
  const c=PC001_HEALTH_CANARY_V0;
  if(!REQUEST_ID_RE.test(String(request_id??''))||typeof auth_user_id!=='string'||!REQUEST_ID_RE.test(auth_user_id))throw Error('SERVER_VERIFIED_OWNER_ID_REQUIRED');
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('SERVER_CLOCK_REQUIRED');
  const idDigest=await stableHashText(`pc001-health-v0|${auth_user_id}|${String(request_id).toLowerCase()}`);
  const issued=now.toISOString(),expires=new Date(now.getTime()+c.ttl_ms).toISOString();
  const payload={
    schema_version:'2.0.0',request_id:`pc001-request-${idDigest.slice(0,30)}`,
    idempotency_key:`pc001-owner-health-${idDigest.slice(0,24)}`,
    issued_at:issued,expires_at:expires,
    device_id:c.device_id,company_id:c.company_id,venture_id:c.venture_id,engine_id:c.engine_id,
    environment:c.environment,version:c.version,capability:c.capability,action:c.action,
    policy:{policy_id:c.policy_id,
      allowed_company_ids:[c.company_id],allowed_venture_ids:[c.venture_id],allowed_engine_ids:[c.engine_id],
      allowed_environments:[c.environment],allowed_versions:[c.version],
      allowed_capabilities:[c.capability],allowed_actions:[c.action],
      state_changing:false,prod_allowed:false,trading_allowed:false
    }
  };
  return {command_id:`pc001-health-${idDigest.slice(0,32)}`,
    company_id:c.company_id,environment:c.environment,device_id:c.device_id,engine_id:c.engine_id,
    version:c.version,idempotency_key:payload.idempotency_key,
    payload,payload_sha256:await stableHashText(JSON.stringify(payload)),state:'QUEUED'};
}
export function publicStatus(command){
  return Object.freeze({
    ok:true,environment:'PREPROD',capability:'SERVICE_HEALTH',action:'READ_HEALTH',
    status:command?.state??'UNKNOWN',command_id:command?.command_id??null,
    semantic_verified:command?.semantic_verified===true,
    remote_desktop_control:false,prod_allowed:false,trading_access:false
  });
}