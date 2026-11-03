/** Server-only adapter for an isolated metadata table. Not connected to PROD in B2. */
const TABLE='jarvis_universal_mission_v0';
const copy=v=>structuredClone(v);
const safe=(s,label,max=200)=>{if(typeof s!=='string'||!s.trim()||s.length>max)throw new TypeError(`${label}_INVALID`);return s;};
function unwrap(result,label){if(result?.error)throw new Error(`${label}_FAILED`);return result?.data;}
export class PostgresMissionStore {
  constructor({serviceClient}){if(!serviceClient?.from)throw new TypeError('SERVICE_CLIENT_REQUIRED');this.client=serviceClient;}
  async get(id){const data=unwrap(await this.client.from(TABLE).select('mission,revision').eq('id',safe(id,'MISSION_ID')).maybeSingle(),'MISSION_READ');return data?{...copy(data.mission),revision:data.revision}:null;}
  async findByIdempotency(scope,key){const i=safe(scope,'SCOPE').lastIndexOf(':');if(i<1)throw new Error('SCOPE_INVALID');const owner=scope.slice(0,i),company=scope.slice(i+1);const data=unwrap(await this.client.from(TABLE).select('mission,revision').eq('owner_id',owner).eq('company_id',company).eq('idempotency_key',safe(key,'KEY')).maybeSingle(),'MISSION_DEDUPE');return data?{...copy(data.mission),revision:data.revision}:null;}
  async createIfAbsent(m){safe(m.id,'MISSION_ID');safe(m.ownerId,'OWNER_ID');safe(m.companyId,'COMPANY_ID');safe(m.idempotencyKey,'KEY');
    const row={id:m.id,owner_id:m.ownerId,company_id:m.companyId,idempotency_key:m.idempotencyKey,revision:0,mission:copy(m)};
    const result=await this.client.from(TABLE).insert(row).select('mission,revision').maybeSingle();
    if(!result?.error&&result?.data)return{...copy(result.data.mission),revision:result.data.revision};
    if(result?.error?.code!=='23505')throw new Error('MISSION_CREATE_FAILED');
    const existing=await this.findByIdempotency(`${m.ownerId}:${m.companyId}`,m.idempotencyKey);
    if(!existing)throw new Error('MISSION_CONCURRENT_RETRY');return existing;
  }
  async put(m){const expected=Number(m?.revision);if(!Number.isSafeInteger(expected)||expected<0)throw new Error('MISSION_REVISION_REQUIRED');
    const updated={...copy(m),revision:expected+1};
    const row=unwrap(await this.client.from(TABLE).update({mission:updated,revision:expected+1,updated_at:updated.updatedAt}).eq('id',safe(m.id,'MISSION_ID')).eq('owner_id',safe(m.ownerId,'OWNER_ID')).eq('company_id',safe(m.companyId,'COMPANY_ID')).eq('revision',expected).select('mission,revision').maybeSingle(),'MISSION_UPDATE');
    if(!row)throw new Error('MISSION_REVISION_CONFLICT');return {...copy(row.mission),revision:row.revision};
  }
}