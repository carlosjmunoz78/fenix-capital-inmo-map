/**
 * ZEUS/JARVIS · B5 VOICE-001 V2 · authenticated audio output seam (LAB, OFF unless
 * all independent server-side adapters positively authorize).
 * No HTTP endpoint, external SDK, secret, provider connection, or PROD migration.
 * Compatible with the existing B2 identity / B3 policy boundary.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const VOICE_ID='cfkJwJs7cjrVgVLm3yvM';
const SENSITIVE=/\b(?:password|contraseña|contrasena|api[_ -]?key|bearer|access[_ -]?token|refresh[_ -]?token|secret|secreto)\b/i;
const valid=x=>typeof x==='string'&&ID.test(x);
const deny=reason=>Object.freeze({state:'DENY',reason,providerCalled:false,audioRef:null,spentEuro:0});
export const JARVIS_V2_OUTPUT=Object.freeze({voiceId:VOICE_ID,profile:'MAS_CLARA',rate:1.10,pitchSemitones:0.6,locale:'es-ES'});
export function createJarvisB5V2TtsOutputPort({
 identityProvider,controlStore,consentStore,b3PolicyService,privacyResolver,
 rateLimiter,budgetLedger,auditStore,providerAdapter,audioStore
}={}){
 const checks=[
  [identityProvider,'verify'],[controlStore,'get'],[consentStore,'check'],
  [b3PolicyService,'authorize'],[privacyResolver,'classify'],[rateLimiter,'allow'],
  [budgetLedger,'reserve'],[budgetLedger,'settle'],[budgetLedger,'release'],
  [auditStore,'append'],[providerAdapter,'synthesize'],[audioStore,'put'],[audioStore,'get']
 ];
 if(checks.some(([object,key])=>typeof object?.[key]!=='function'))throw Error('VOICE_V2_TRUSTED_SERVER_ADAPTERS_REQUIRED');
 async function authorized(r,operation){
  if(!r||r.environment!=='LAB'||r.channel!=='CEREBRO_CONSOLE'||
    !valid(r.companyId)||!valid(r.sessionId)||!valid(r.requestId)||
    !valid(r.consentRef)||!r.token)return {error:'REQUEST_INVALID_OR_PROD_DENIED'};
  let principal;
  try{principal=await identityProvider.verify(r.token)}catch{return {error:'AUTH_UNAVAILABLE'};}
  if(!valid(principal?.ownerId)||principal.sessionId!==r.sessionId||
   !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT')||
   !Array.isArray(principal.authorizedCompanies)||!principal.authorizedCompanies.includes(r.companyId))
   return {error:'OWNER_SCOPE_DENIED'};
  try{
   const c=await controlStore.get({companyId:r.companyId,environment:'LAB',engineId:'VOICE-001'});
   if(c?.enabled!==true||c?.killSwitch!==false||c?.voiceV2Enabled!==true)return {error:'VOICE_V2_FEATURE_OFF'};
   if(await consentStore.check({ownerId:principal.ownerId,companyId:r.companyId,sessionId:r.sessionId,consentRef:r.consentRef,purpose:operation})!==true)
    return {error:'VOICE_CONSENT_REQUIRED'};
   const decision=await b3PolicyService.authorize({token:r.token,companyId:r.companyId,environment:'LAB',actionName:'JARVIS_V2_'+operation,sessionId:r.sessionId});
   if(decision?.decision!=='ALLOW')return {error:'B3_VOICE_POLICY_DENIED'};
   return {principal};
  }catch{return {error:'CONTROL_OR_POLICY_UNAVAILABLE'};}
 }
 async function synthesize(r={}){
  if(typeof r.text!=='string'||!r.text.trim()||r.text.length>1200||SENSITIVE.test(r.text))
   return deny('TTS_TEXT_REJECTED');
  if(r.profileId!== 'JARVIS_V2_CLARA_ES_ES')return deny('PROFILE_NOT_APPROVED');
  const auth=await authorized(r,'TTS');
  if(auth.error)return deny(auth.error);
  try{
   const privacy=await privacyResolver.classify({companyId:r.companyId,environment:'LAB',text:r.text});
   if(!['PUBLIC','INTERNAL'].includes(privacy?.privacy))return deny('REMOTE_TTS_PRIVACY_DENIED');
   const allowed=await rateLimiter.allow({companyId:r.companyId,sessionId:r.sessionId,requestId:r.requestId,capability:'JARVIS_V2_TTS'});
   if(allowed!==true)return deny('RATE_LIMITED');
   const audited=await auditStore.append({eventCode:'JARVIS_V2_TTS_REQUEST',companyId:r.companyId,
    environment:'LAB',sessionId:r.sessionId,requestId:r.requestId,voiceProfileId:r.profileId});
   if(audited!==true)return deny('AUDIT_UNAVAILABLE');
  }catch{return deny('PRECHECK_UNAVAILABLE');}
  // No call is made on an absent or exhausted quota. Provider credits are not EUR.
  let hold;
  try{hold=await budgetLedger.reserve({companyId:r.companyId,environment:'LAB',requestId:r.requestId,
   provider:'VIDIQ',maxCredits:14,allowRecharge:false,requireVerifiedPrepaid:true});}
  catch{return deny('BUDGET_UNAVAILABLE');}
  if(hold?.state!=='HELD'||!valid(hold.reservationId)||!Number.isInteger(hold.maxCredits)||
     hold.maxCredits<1||hold.maxCredits>14)return deny('PREPAID_CREDIT_NOT_RESERVED');
  let called=false;
  try{
   called=true;
   const audio=await providerAdapter.synthesize({text:r.text,voiceId:VOICE_ID,
    profileId:r.profileId,requestedRate:1.10,requestedPitchSemitones:0.6,
    reservationId:hold.reservationId,requestId:r.requestId});
   if(audio?.voiceId!==VOICE_ID||audio?.mimeType!=='audio/mpeg'||
     !(audio.bytes instanceof Uint8Array)||audio.bytes.byteLength<100||
     audio.bytes.byteLength>5_000_000||audio.rateApplied!==1.10||
     audio.pitchSemitonesApplied!==0.6||!Number.isInteger(audio.creditsCharged)||
     audio.creditsCharged<0||audio.creditsCharged>hold.maxCredits)
    throw Error('RENDER_NOT_APPROVED');
   const ref=await audioStore.put({bytes:audio.bytes,contentType:'audio/mpeg',
    ownerId:auth.principal.ownerId,companyId:r.companyId,environment:'LAB',
    sessionId:r.sessionId,requestId:r.requestId,ttlSeconds:600});
   if(!valid(ref))throw Error('AUDIO_STORE_UNAVAILABLE');
   const settled=await budgetLedger.settle({reservationId:hold.reservationId,
    creditsCharged:audio.creditsCharged,requestId:r.requestId});
   if(settled!==true)throw Error('BUDGET_SETTLEMENT_UNVERIFIED');
   const finished=await auditStore.append({eventCode:'JARVIS_V2_TTS_READY',companyId:r.companyId,
    environment:'LAB',sessionId:r.sessionId,requestId:r.requestId,audioRef:ref,creditsCharged:audio.creditsCharged});
   if(finished!==true)throw Error('AUDIT_UNAVAILABLE');
   return Object.freeze({state:'AUDIO_READY',reason:null,audioRef:ref,
    voiceProfileId:r.profileId,rate:1.10,pitchSemitones:0.6,
    mimeType:'audio/mpeg',ttlSeconds:600,providerCalled:true,
    creditsCharged:audio.creditsCharged,spentEuro:0,prodAuthorized:false});
  }catch{
   try{await budgetLedger.release({reservationId:hold.reservationId,requestId:r.requestId})}catch{}
   // A provider call might incur credits even if delivery fails: do NOT claim zero use.
   return Object.freeze({state:'DENY',reason:'TTS_DELIVERY_OR_ACCOUNTING_FAILED',
    audioRef:null,providerCalled:called,creditsStatus:'RECONCILIATION_REQUIRED',spentEuro:null});
  }
 }
 async function getAudio(r={}){
  const auth=await authorized(r,'AUDIO_READ');
  if(auth.error)return deny(auth.error);
  if(!valid(r.audioRef))return deny('AUDIO_REF_INVALID');
  try{
   const audio=await audioStore.get({audioRef:r.audioRef,ownerId:auth.principal.ownerId,
    companyId:r.companyId,environment:'LAB',sessionId:r.sessionId});
   if(audio?.contentType!=='audio/mpeg'||!(audio.bytes instanceof Uint8Array)||
      audio.bytes.byteLength>5_000_000||audio.bytes.byteLength<100)return deny('AUDIO_NOT_AVAILABLE');
   return {state:'AUDIO_BYTES_AUTHORIZED',contentType:'audio/mpeg',
    bytes:audio.bytes,cacheControl:'private, no-store',ttlSeconds:0};
  }catch{return deny('AUDIO_NOT_AVAILABLE');}
 }
 return Object.freeze({synthesize,getAudio,profile:JARVIS_V2_OUTPUT});
}
