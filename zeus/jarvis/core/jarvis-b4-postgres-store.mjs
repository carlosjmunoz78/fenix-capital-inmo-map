/** B4 PostgreSQL adapter: trusted, parameterized direct connection, private schema only.
 * The migration is intentionally not part of any App/CRM installation.
 */
const copied=x=>structuredClone(x);
const valid=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,179}$/.test(x);
const must=(v,n)=>{if(!valid(v))throw Error(`${n}_INVALID`);return v;};
export function createJarvisB4PostgresStore({query}={}){
 if(typeof query!=='function')throw Error('TRUSTED_POSTGRES_QUERY_REQUIRED');
 return Object.freeze({
  async appendUnique(e){
   for(const k of ['ownerId','companyId','environment','projectId','idempotencyKey'])must(e?.[k],k);
   const params=[e.id,e.ownerId,e.companyId,e.environment,e.projectId,e.idempotencyKey,e.fingerprint,JSON.stringify(e)];
   const added=await query(`INSERT INTO zeus_jarvis.b4_memory_event(id,owner_id,company_id,environment,project_id,idempotency_key,fingerprint,event)
    VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT (owner_id,company_id,environment,project_id,idempotency_key) DO NOTHING
    RETURNING seq,event`,params);
   if(added.rows?.[0])return {event:{...copied(added.rows[0].event),sequence:Number(added.rows[0].seq)},replayed:false};
   const old=await query(`SELECT seq,event,fingerprint FROM zeus_jarvis.b4_memory_event
    WHERE owner_id=$1 AND company_id=$2 AND environment=$3 AND project_id=$4 AND idempotency_key=$5`,[e.ownerId,e.companyId,e.environment,e.projectId,e.idempotencyKey]);
   const found=old.rows?.[0];if(!found)throw Error('B4_CONCURRENT_RETRY');
   if(found.fingerprint!==e.fingerprint)throw Error('IDEMPOTENCY_CONFLICT');
   return {event:{...copied(found.event),sequence:Number(found.seq)},replayed:true};
  },
  async list(s){for(const k of ['ownerId','companyId','environment','projectId'])must(s?.[k],k);
   const rows=await query(`SELECT seq,event FROM zeus_jarvis.b4_memory_event
    WHERE owner_id=$1 AND company_id=$2 AND environment=$3 AND project_id=$4 ORDER BY seq ASC`,[s.ownerId,s.companyId,s.environment,s.projectId]);
   return (rows.rows||[]).map(r=>({...copied(r.event),sequence:Number(r.seq)}));
  }
 });
}

/**
 * Read-only dual gate for the existing B3 authority and B4 memory runtime.
 * Must be provided by an authenticated, server-only PostgreSQL connection.
 * B4 cannot turn itself on while the upstream B3 authority is disabled.
 * Absence of either row / a database error fails closed.
 */
export function createJarvisB4GuardedControlStore({query}={}) {
 if(typeof query!=='function')throw Error('TRUSTED_POSTGRES_QUERY_REQUIRED');
 return Object.freeze({
  async get({companyId,environment}={}) {
   must(companyId,'COMPANY_ID');
   if(!['LAB','PREPROD','PROD'].includes(environment))throw Error('ENVIRONMENT_INVALID');
   const sql = `SELECT b4.enabled AS memory_enabled,b4.kill_switch AS memory_kill_switch,
     b3.enabled AS authority_enabled,b3.kill_switch AS authority_kill_switch
     FROM zeus_jarvis.b4_memory_control AS b4
     INNER JOIN zeus_jarvis.b3_runtime_control AS b3
       ON b3.company_id=b4.company_id AND b3.environment=b4.environment
     WHERE b4.company_id=$1 AND b4.environment=$2`;
   const result=await query(sql,[companyId,environment]);
   const row=result?.rows?.[0];
   return Object.freeze({
    enabled:row?.memory_enabled===true && row?.authority_enabled===true,
    killSwitch:row?.memory_kill_switch!==false || row?.authority_kill_switch!==false
   });
  }
 });
}
