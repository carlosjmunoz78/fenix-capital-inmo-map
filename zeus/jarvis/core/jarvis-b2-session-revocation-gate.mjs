/**
 * CUT16 · Fail-closed server-only B2 session revocation gate (LAB candidate).
 * Composes after the existing trusted channel + global owner identity adapters.
 * The session lookup receives ONLY a keyed session digest, never a bearer token
 * or raw session identifier. No enrolment, grants, DB migrations or PROD hooks.
 */
import {createHmac, timingSafeEqual} from 'node:crypto';

const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;
const HEX=/^[a-f0-9]{64}$/;
const valid=v=>typeof v==='string'&&ID.test(v);
const fail=()=>{throw Error('B2_SESSION_NOT_VERIFIED')};
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&HEX.test(a)&&HEX.test(b)&&
  timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));

export function createJarvisB2SessionRevocationGate({identityProvider,sessionStore,
  secret,clock=()=>Date.now(),environment='LAB',enabled=false}={}){
 if(typeof enabled!=='boolean')throw TypeError('ENABLED_MUST_BE_BOOLEAN');
 if(environment!=='LAB'&&enabled)throw TypeError('B2_SESSION_LAB_ONLY');
 if(enabled&&(typeof identityProvider?.verify!=='function'||
   typeof sessionStore?.get!=='function'||!Buffer.isBuffer(secret)||secret.byteLength<32||
   typeof clock!=='function'))throw TypeError('B2_SERVER_SESSION_ADAPTERS_REQUIRED');
 const key=enabled?Buffer.from(secret):null;
 return Object.freeze({async verify(token){
  if(!enabled)fail();
  let principal;
  try{principal=await identityProvider.verify(token)}catch{fail()}
  if(!valid(principal?.ownerId)||!valid(principal?.sessionId)||
     !Array.isArray(principal?.roles)||!principal.roles.includes('OWNER_ROOT')||
     !Array.isArray(principal?.authorizedCompanies)||
     !principal.authorizedCompanies.length||
     principal.authorizedCompanies.some(c=>!valid(c)||c==='*'))fail();
  const sessionHmac=createHmac('sha256',key).update('jarvis-b2-session-v0\0')
    .update(principal.ownerId).update('\0').update(principal.sessionId).digest('hex');
  let row;
  try{row=await sessionStore.get({ownerId:principal.ownerId,sessionHmac,
    environment:'LAB'});}catch{fail()}
  let now;
  try{now=clock()}catch{fail()}
  if(!Number.isFinite(now)||!row||row.ownerId!==principal.ownerId||
     !same(row.sessionHmac,sessionHmac)||row.environment!=='LAB'||
     row.active!==true||row.revoked===true||row.role!=='OWNER_ROOT'||
     !Number.isFinite(row.expiresAt)||row.expiresAt<=now||
     !Array.isArray(row.authorizedCompanies)||!row.authorizedCompanies.length||
     row.authorizedCompanies.some(c=>!valid(c)||c==='*'))fail();
  const companies=[...new Set(principal.authorizedCompanies.filter(c=>
    row.authorizedCompanies.includes(c)))];
  if(!companies.length)fail();
  return Object.freeze({ownerId:principal.ownerId,sessionId:principal.sessionId,
   roles:Object.freeze(['OWNER_ROOT']),authorizedCompanies:Object.freeze(companies)});
 }});
}
