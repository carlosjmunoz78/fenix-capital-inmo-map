/** Server-only B2 identity binding resolver. LAB candidate: no provisioning, no writes. */
import {createHmac} from 'node:crypto';
const channelPattern=/^[a-z][a-z0-9-]{1,79}$/;
const subjectPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const companyPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/;
const ownerPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const deny=()=>{throw Error('OWNER_ROOT_REQUIRED')};
export function createJarvisB2HmacRegistry({secret,lookup,allowedChannels=['fenix-app'],environment='LAB'}={}){
 if(environment!=='LAB')throw TypeError('LAB_ONLY_ADAPTER');
 if(!Buffer.isBuffer(secret)||secret.byteLength<32)throw TypeError('SERVER_VAULT_HMAC_KEY_REQUIRED');
 if(typeof lookup!=='function')throw TypeError('PRIVATE_LOOKUP_REQUIRED');
 if(!Array.isArray(allowedChannels)||!allowedChannels.length||allowedChannels.some(c=>typeof c!=='string'||!channelPattern.test(c)))throw TypeError('TRUSTED_CHANNELS_REQUIRED');
 const key=Buffer.from(secret);
 const channels=new Set(allowedChannels);
 return Object.freeze({
  async resolve({channel,subject}={}){
   if(typeof channel!=='string'||!channels.has(channel)||!channelPattern.test(channel)||
      typeof subject!=='string'||!subjectPattern.test(subject))deny();
   // Domain-separated HMAC, never persist or query by a raw auth subject.
   const subjectHmac=createHmac('sha256',key).update('jarvis-b2-v0\0').update(channel).update('\0').update(subject).digest('hex');
   let record;
   try{record=await lookup({channel,subjectHmac});}catch{deny()}
   if(!record||record.channel!==channel||record.subject_hmac!==subjectHmac||
      record.active!==true||record.role!=='OWNER_ROOT'||!ownerPattern.test(record.owner_id??'')||
      !Array.isArray(record.authorized_companies)||record.authorized_companies.length<1||
      record.authorized_companies.length>50||record.authorized_companies.some(c=>typeof c!=='string'||!companyPattern.test(c)||c==='*'))deny();
   return Object.freeze({active:true,role:'OWNER_ROOT',ownerId:record.owner_id,
      authorizedCompanies:Object.freeze([...new Set(record.authorized_companies)])});
  }
 });
}
