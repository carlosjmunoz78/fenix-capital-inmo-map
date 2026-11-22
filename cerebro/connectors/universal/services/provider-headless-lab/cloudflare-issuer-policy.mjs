// FACT-001 Cloudflare account-token issuer safety gate. No secrets, no HTTP mutations.
// This pure module denies minting if the candidate still carries legacy elevated scopes.
export const ACCOUNT_ID='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const ISSUER_V1='cerebro_cf_account_token_issuer_v1';
export const ISSUER_V2='cerebro_cf_account_token_issuer_v2';
export const ACCOUNT_RESOURCE='com.cloudflare.api.account.'+ACCOUNT_ID;
export const REQUIRED='Account API Tokens Write';
export const FORBIDDEN=Object.freeze(['Billing Write','Billing Read','Integration Write','Account API Gateway','Account API Gateway Read']);
export const CHILD_ALLOWED=Object.freeze(['D1 Read']);
export function describeIssuer(token,permissionNamesById={}){
 if(!token||typeof token!=='object'||!Array.isArray(token.policies))throw Error('ISSUER_METADATA_INVALID');
 const policies=token.policies;
 const permissions=policies.flatMap(p=>(p.permission_groups||[]).map(g=>permissionNamesById[g.id]||'UNKNOWN'));
 const resources=policies.flatMap(p=>Object.keys(p.resources||{}));
 return Object.freeze({name:token.name,status:token.status,permissions,resources,policy_count:policies.length});
}
export function assertMinimalIssuer(issuer){
 if(!issuer||issuer.name!==ISSUER_V2||issuer.status!=='active'||issuer.policy_count!==1||
   issuer.resources?.length!==1||issuer.resources[0]!==ACCOUNT_RESOURCE||
   issuer.permissions?.length!==1||issuer.permissions[0]!==REQUIRED)throw Error('ISSUER_SCOPE_NOT_MINIMAL');
 return true;
}
export function inspectIssuerV1(issuer){
 if(!issuer||issuer.name!==ISSUER_V1)throw Error('LEGACY_ISSUER_NOT_IDENTIFIED');
 const elevated=issuer.permissions.filter(p=>p!==REQUIRED);
 return Object.freeze({state:elevated.length?'BLOCKED_OVERPRIVILEGED':'MINIMUM_SCOPE_CANDIDATE',
   elevated,has_required:issuer.permissions.includes(REQUIRED),secret_exposed:false,
   mutation_allowed:false});
}
export function makeMinimalIssuerPolicy(permissionGroups){
 const matches=(permissionGroups||[]).filter(g=>g.name===REQUIRED);
 if(matches.length!==1||typeof matches[0].id!=='string'||!/^[0-9a-f]{32}$/.test(matches[0].id))throw Error('PERMISSION_GROUP_UNVERIFIED');
 return Object.freeze({name:ISSUER_V2,policies:[{effect:'allow',resources:{[ACCOUNT_RESOURCE]:'*'},permission_groups:[{id:matches[0].id}]}]});
}
export function assertChildRequest(order,principal){
 // Fail closed: identity is injected by the trusted backend, not read from model parameters.
 if(!principal?.verified||principal.client_id!=='cerebro'||principal.identity_ref!=='iam:owner:verified-signed'||principal.environment!=='LAB')throw Error('OWNER_SIGNATURE_REQUIRED');
 const expected={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
   source:'owner_order',operation:'cloudflare.token.child.readonly.create',capability:'cloudflare.d1.read',
   request_id:'CF-TOKEN-ISSUER-001-20261111',max_cost_eur:0};
 if(!order||typeof order!=='object'||Array.isArray(order)||Object.keys(order).length!==Object.keys(expected).length||
   Object.entries(expected).some(([k,v])=>order[k]!==v))throw Error('CHILD_ORDER_SCOPE_DENIED');
 return Object.freeze({scope:ACCOUNT_RESOURCE,permission:'D1 Read',expires_after_hours:24,
   token_response_destination:'VAULT_DIRECT_ONLY',metadata_only:true,replay_key:order.request_id});
}
