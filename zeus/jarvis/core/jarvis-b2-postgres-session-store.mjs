/** CUT17: Read-only LAB PostgreSQL session record lookup. Server-only connection. */
const OWNER=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const HMAC=/^[a-f0-9]{64}$/;
const SQL=`SELECT owner_id,session_hmac,environment,role,active,revoked,
 authorized_companies,extract(epoch from expires_at)*1000 AS expires_at_ms
 FROM jarvis_lab_identity.session_binding_v0
 WHERE owner_id=$1 AND session_hmac=$2 AND environment='LAB' LIMIT 2`;
export function createJarvisB2PostgresSessionStore({client,environment='LAB'}={}){
 if(environment!=='LAB')throw TypeError('B2_SESSION_LAB_ONLY');
 if(typeof client?.query!=='function')throw TypeError('TRUSTED_SESSION_POSTGRES_CLIENT_REQUIRED');
 return Object.freeze({async get({ownerId,sessionHmac,environment:scope}={}){
  if(scope!=='LAB'||typeof ownerId!=='string'||!OWNER.test(ownerId)||
    typeof sessionHmac!=='string'||!HMAC.test(sessionHmac))throw Error('B2_SESSION_SCOPE_INVALID');
  let result;
  try{result=await client.query({text:SQL,values:[ownerId,sessionHmac]});}
  catch{throw Error('B2_SESSION_DB_UNAVAILABLE')}
  if(!Array.isArray(result?.rows)||result.rows.length>1)throw Error('B2_SESSION_ROW_AMBIGUOUS');
  if(!result.rows.length)return null;
  const row=result.rows[0];
  if(row?.owner_id!==ownerId||row.session_hmac!==sessionHmac||row.environment!=='LAB'||
    typeof row.active!=='boolean'||typeof row.revoked!=='boolean'||
    row.role!=='OWNER_ROOT'||!Array.isArray(row.authorized_companies)||
    !row.authorized_companies.length||!Number.isFinite(Number(row.expires_at_ms)))
    throw Error('B2_SESSION_ROW_INVALID');
  return Object.freeze({ownerId:row.owner_id,sessionHmac:row.session_hmac,
    environment:row.environment,role:row.role,active:row.active,
    revoked:row.revoked,authorizedCompanies:Object.freeze([...row.authorized_companies]),
    expiresAt:Number(row.expires_at_ms)});
 }});
}
