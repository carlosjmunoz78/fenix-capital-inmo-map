/**
 * CUT25 · Private gateway denial auditor (LAB candidate, OFF by default).
 * Wrap the final existing perimeter→B2→B3 Gateway handler. A sanitized
 * record covers non-2xx denials EVEN when B3 is never reached.
 *
 * Retains ONLY a fixed reason class, numeric HTTP status and timestamp.
 * Does not inspect, store or log Request, Authorization, JWT, URL, IP, UA,
 * owner_id, session_id, company_id or response body.
 *
 * The caller must supply a server-trusted quotaGuard: unauthenticated
 * requests must not consume unbounded D1 writes on Workers Free.
 * quotaGuard failures deny; those denials are NOT logged in D1.
 * This is NOT yet deployed or wired into any live Worker.
 */
const reasonClasses=Object.freeze({
  400:'BAD_REQUEST',401:'AUTH_REQUIRED',403:'ACCESS_DENIED',
  404:'NOT_FOUND',405:'METHOD_DENIED',429:'RATE_LIMITED',
  503:'DEPENDENCY_UNAVAILABLE'
});
const SQL="INSERT INTO jarvis_lab_gateway_denial_audit_v0 (engine_id,environment,stage,reason_class,http_status,created_at_ms) VALUES ('JARVIS','LAB','GATEWAY',?,?,?)";
const fail=(status,reason)=>new Response(JSON.stringify({
  status:'DENIED',reason
}),{status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function createJarvisD1GatewayDenialAudit({
  db,environment='LAB',clock=()=>Date.now()
}={}){
 if(environment!=='LAB')throw TypeError('GATEWAY_AUDIT_LAB_ONLY');
 if(typeof db?.prepare!=='function'||typeof clock!=='function')
  throw TypeError('TRUSTED_GATEWAY_AUDIT_BINDING_REQUIRED');
 return Object.freeze({async append({httpStatus}={}){
  if(!Object.hasOwn(reasonClasses,httpStatus))return false;
  let now;
  try{now=clock()}catch{return false}
  if(!Number.isSafeInteger(now)||now<=0)return false;
  let result;
  try{result=await db.prepare(SQL).bind(reasonClasses[httpStatus],httpStatus,now).run()}
  catch{return false}
  return result?.success===true&&result?.meta?.changes===1;
 }});
}
export function createJarvisGatewayDenialAuditWrapper({
  handler,audit,quotaGuard,environment='LAB',enabled=false
}={}){
 if(typeof handler!=='function')throw TypeError('TRUSTED_GATEWAY_HANDLER_REQUIRED');
 if(typeof enabled!=='boolean')throw TypeError('AUDIT_ENABLED_BOOLEAN_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('GATEWAY_AUDIT_LAB_ONLY');
 if(enabled&&(typeof audit?.append!=='function'||typeof quotaGuard!=='function'))
  throw TypeError('TRUSTED_GATEWAY_AUDIT_AND_QUOTA_REQUIRED');
 return async function auditedGateway(request,env){
  if(!enabled)return fail(503,'GATEWAY_AUDIT_DISABLED');
  // No logging or inspection of the request. The existing perimeter,
  // B2 and B3 handlers still exclusively own authorization decisions.
  let response;
  try{response=await handler(request,env)}catch{
   response=fail(503,'GATEWAY_UNAVAILABLE');
  }
  if(!(response instanceof Response))response=fail(503,'GATEWAY_INVALID_RESPONSE');
  if(response.status>=200&&response.status<300)return response;
  const status=Object.hasOwn(reasonClasses,response.status)?response.status:503;
  let budget;
  try{budget=await quotaGuard()}catch{return fail(503,'AUDIT_QUOTA_UNAVAILABLE')}
  if(budget!==true)return fail(429,'AUDIT_QUOTA_EXHAUSTED');
  let saved;
  try{saved=await audit.append({httpStatus:status})}catch{saved=false}
  if(saved!==true)return fail(503,'GATEWAY_SECURITY_AUDIT_UNAVAILABLE');
  return status===response.status?response:fail(503,'GATEWAY_DENIED');
 };
}
