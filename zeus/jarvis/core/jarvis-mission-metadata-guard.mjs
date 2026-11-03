/** Minimal metadata only in live JARVIS B2. No free-form user text or untrusted credentials. */
const KEYS=new Set(['topic','scope','filters','labels']);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:\/-]{0,99}$/;
export function validateMissionMetadata(payload,{environment='LAB'}={}){
 if(!['LAB','PREPROD','PROD'].includes(environment))throw new TypeError('ENVIRONMENT_INVALID');
 if(payload===null||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('PAYLOAD_INVALID');
 if(environment==='LAB')return payload;
 const serialized=JSON.stringify(payload);
 if(typeof serialized!=='string'||new TextEncoder().encode(serialized).byteLength>2048)throw new TypeError('PAYLOAD_INVALID');
 for(const [key,value] of Object.entries(payload)){
   if(!KEYS.has(key))throw new TypeError('PAYLOAD_FIELD_NOT_ALLOWED_INVALID');
   if(key==='topic'||key==='scope'){if(typeof value!=='string'||!ID.test(value))throw new TypeError('PAYLOAD_FIELD_INVALID');}
   else if(!Array.isArray(value)||value.length>20||value.some(v=>typeof v!=='string'||!ID.test(v)))throw new TypeError('PAYLOAD_FIELD_INVALID');
 }
 return payload;
}
