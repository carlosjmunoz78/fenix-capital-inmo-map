/** ZEUS binding registry: server-only, fail-closed; no tokens or raw external subject IDs stored. */
import {createHmac} from 'node:crypto';
const safe=(v,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max&&v.trim()===v;
export class ZeusBindingRegistry {
  constructor({serviceClient,subjectHmacKey}) {
    if(!serviceClient?.from||typeof subjectHmacKey!=='string'||subjectHmacKey.length<32)throw new TypeError('BINDING_REGISTRY_CONFIG_REQUIRED');
    this.db=serviceClient;this.key=subjectHmacKey;
  }
  digest(channel,subject){
    if(!safe(channel,80)||!safe(subject,512))throw new Error('AUTH_DENIED');
    return createHmac('sha256',this.key).update(JSON.stringify([channel,subject]),'utf8').digest('hex');
  }
  async resolve({channel,subject}) {
    const digest=this.digest(channel,subject);
    const {data,error}=await this.db.from('jarvis_zeus_identity_binding_v0')
      .select('owner_id,role,active,authorized_companies').eq('channel',channel).eq('subject_hmac',digest).maybeSingle();
    if(error)throw new Error('IDENTITY_REGISTRY_UNAVAILABLE');
    if(!data||data.active!==true||data.role!=='OWNER_ROOT'||!safe(data.owner_id,200)||
      !Array.isArray(data.authorized_companies)||!data.authorized_companies.length||
      data.authorized_companies.some(x=>!safe(x,100)||x==='*'))return null;
    return {ownerId:data.owner_id,role:data.role,active:true,authorizedCompanies:data.authorized_companies};
  }
}