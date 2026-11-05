/** B2 PostgreSQL adapter for an isolated LAB database. Read-only; never enrols an owner. */
const hex64=/^[a-f0-9]{64}$/;
const channel=/^[a-z][a-z0-9-]{1,79}$/;
const QUERY=`SELECT channel, subject_hmac, owner_id, role, active, authorized_companies
FROM jarvis_lab_identity.owner_binding_v0
WHERE channel = $1 AND subject_hmac = $2
LIMIT 2`;
export function createJarvisB2PostgresLookup({client,environment='LAB'}={}){
 if(environment!=='LAB')throw TypeError('LAB_ONLY_POSTGRES_LOOKUP');
 if(typeof client?.query!=='function')throw TypeError('POSTGRES_CLIENT_REQUIRED');
 return async function lookup({channel:requestedChannel,subjectHmac}={}){
  if(typeof requestedChannel!=='string'||!channel.test(requestedChannel)||
    typeof subjectHmac!=='string'||!hex64.test(subjectHmac))throw Error('B2_QUERY_DENIED');
  let result;
  try{
   result=await client.query({text:QUERY,values:[requestedChannel,subjectHmac],
    name:'jarvis_b2_lab_binding_lookup_v0'});
  }catch{throw Error('B2_LOOKUP_UNAVAILABLE')}
  if(!Array.isArray(result?.rows)||result.rows.length!==1)throw Error('B2_BINDING_AMBIGUOUS_OR_ABSENT');
  const row=result.rows[0];
  if(!row||row.channel!==requestedChannel||row.subject_hmac!==subjectHmac)return null;
  return Object.freeze({
   channel:row.channel,subject_hmac:row.subject_hmac,owner_id:row.owner_id,
   role:row.role,active:row.active,authorized_companies:row.authorized_companies
  });
 };
}
