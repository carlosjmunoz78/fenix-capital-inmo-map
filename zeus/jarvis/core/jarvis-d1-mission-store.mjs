/** CUT19 - isolated LAB Cloudflare D1 (SQLite) mission store.
 * Preserves JarvisUniversalCore storage contract, not deployed.
 * D1 has no PostgreSQL RLS: NEVER expose its binding to browser/public SQL.
 * B2/B3 must authenticate each request; all writes scope owner/company/LAB.
 */
const id=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const valid=(v,name,max=200)=>{
 if(typeof v!=='string'||v.length>max||!id.test(v))throw TypeError(name+'_INVALID');
 return v;
};
const copy=x=>structuredClone(x);
const MAX_BYTES=32768;
const sql={
 byId:"SELECT mission_json,revision FROM jarvis_lab_mission_v0 WHERE id=? AND environment='LAB' LIMIT 1",
 byScopedId:"SELECT mission_json,revision FROM jarvis_lab_mission_v0 WHERE id=? AND owner_id=? AND company_id=? AND environment='LAB' LIMIT 1",
 byKey:"SELECT mission_json,revision FROM jarvis_lab_mission_v0 WHERE owner_id=? AND company_id=? AND environment='LAB' AND idempotency_key=? LIMIT 1",
 create:"INSERT INTO jarvis_lab_mission_v0 (id,owner_id,company_id,engine_id,environment,version,project_id,idempotency_key,revision,mission_json,created_at,updated_at) VALUES (?,?,?,?,'LAB',?,?,?,0,?,?,?) ON CONFLICT(owner_id,company_id,environment,idempotency_key) DO NOTHING RETURNING mission_json,revision",
 update:"UPDATE jarvis_lab_mission_v0 SET mission_json=?,revision=?,updated_at=? WHERE id=? AND owner_id=? AND company_id=? AND engine_id=? AND environment='LAB' AND revision=? RETURNING mission_json,revision"
};
function encode(m){
 if(m?.environment!=='LAB')throw Error('D1_LAB_ONLY');
 for(const name of ['id','ownerId','companyId','engineId','projectId','idempotencyKey'])
  valid(m?.[name],name.toUpperCase());
 const version=valid(m.version??m.coreVersion,'VERSION',100);
 for(const name of ['createdAt','updatedAt'])
  if(typeof m?.[name]!=='string'||!Number.isFinite(Date.parse(m[name])))
   throw Error(name.toUpperCase()+'_INVALID');
 const json=JSON.stringify(m);
 if(typeof json!=='string'||new TextEncoder().encode(json).byteLength>MAX_BYTES)
  throw Error('MISSION_SIZE_INVALID');
 return {json,version};
}
function decode(row){
 if(!row)return null;
 try{
  const m=JSON.parse(row.mission_json),revision=Number(row.revision);
  if(!m||m.environment!=='LAB'||!Number.isSafeInteger(revision)||revision<0)
   throw Error('INVALID');
  return copy({...m,revision});
 }catch{throw Error('D1_MISSION_CORRUPT')}
}
function scopeParts(scope,key){
 const value=valid(scope,'SCOPE',240),i=value.lastIndexOf(':');
 if(i<1||i===value.length-1)throw Error('SCOPE_INVALID');
 return [valid(value.slice(0,i),'OWNER_ID'),valid(value.slice(i+1),'COMPANY_ID'),
   valid(key,'IDEMPOTENCY_KEY')];
}
export function createJarvisD1MissionStore({db,environment='LAB'}={}){
 if(environment!=='LAB')throw TypeError('D1_LAB_ONLY');
 if(typeof db?.prepare!=='function')throw TypeError('TRUSTED_D1_BINDING_REQUIRED');
 async function first(text,args){
  try{return await db.prepare(text).bind(...args).first()}
  catch{throw Error('D1_READ_UNAVAILABLE')}
 }
 async function run(text,args){
  try{
   const result=await db.prepare(text).bind(...args).run();
   if(result?.success!==true||!Array.isArray(result.results))
    throw Error('NO_RESULT');
   return result.results;
  }catch{throw Error('D1_WRITE_UNAVAILABLE')}
 }
 return Object.freeze({
  async get(missionId){
   return decode(await first(sql.byId,[valid(missionId,'MISSION_ID')]));
  },
  async getForScope({missionId,ownerId,companyId}={}){
   return decode(await first(sql.byScopedId,[
    valid(missionId,'MISSION_ID'),valid(ownerId,'OWNER_ID'),valid(companyId,'COMPANY_ID')
   ]));
  },
  async findByIdempotency(scope,key){
   return decode(await first(sql.byKey,scopeParts(scope,key)));
  },
  async createIfAbsent(m){
   const {json,version}=encode(m);
   const inserted=await run(sql.create,[
    m.id,m.ownerId,m.companyId,m.engineId,version,m.projectId,
    m.idempotencyKey,json,m.createdAt,m.updatedAt
   ]);
   if(inserted.length===1)return decode(inserted[0]);
   if(inserted.length!==0)throw Error('D1_CREATE_AMBIGUOUS');
   const old=await first(sql.byKey,[m.ownerId,m.companyId,m.idempotencyKey]);
   if(!old)throw Error('D1_CREATE_RECONCILIATION_REQUIRED');
   return decode(old);
  },
  async put(m){
   encode(m);
   const rev=m.revision;
   if(!Number.isSafeInteger(rev)||rev<0)throw Error('MISSION_REVISION_REQUIRED');
   const updated=copy({...m,revision:rev+1});
   const encoded=encode(updated);
   const result=await run(sql.update,[
    encoded.json,rev+1,m.updatedAt,m.id,m.ownerId,m.companyId,m.engineId,rev
   ]);
   if(result.length===0)throw Error('MISSION_REVISION_CONFLICT');
   if(result.length!==1)throw Error('D1_UPDATE_AMBIGUOUS');
   return decode(result[0]);
  }
 });
}
