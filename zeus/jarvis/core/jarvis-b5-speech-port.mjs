/** ZEUS/JARVIS B5 · server-side STT/TTS adapter contract, LAB V0.
 * This is NOT an audio provider, recording system, web endpoint or PROD wiring.
 * Audio reference and transcripts never enter audit logs. Explicit consent, verified
 * B2 identity, B3 action grant + kill switch, optional B5 feature gate are required.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const sensitive=/\b(?:password|contrase(?:ñ|n)a|api[_ -]?key|bearer\s|access[_ -]?token|refresh[_ -]?token)\b/i;
const safeId=(id,name)=>{if(typeof id!=='string'||!ID.test(id))throw Error(name+'_INVALID');return id;};
export function createJarvisB5SpeechPort({identityProvider,consentStore,controlStore,b3PolicyService,auditStore,sttAdapter=null,ttsAdapter=null}={}){
 if(typeof identityProvider?.verify!=='function'||typeof consentStore?.check!=='function'
  ||typeof controlStore?.get!=='function'||typeof b3PolicyService?.authorize!=='function'
  ||typeof auditStore?.append!=='function')throw Error('B5_SERVER_SECURITY_ADAPTERS_REQUIRED');
 async function authorize({token,companyId,environment,sessionId,consentRef,operation}){
  safeId(companyId,'COMPANY_ID');safeId(sessionId,'SESSION_ID');safeId(consentRef,'CONSENT_REF');
  if(!['LAB','PREPROD','PROD'].includes(environment))throw Error('ENVIRONMENT_INVALID');
  if(!token)throw Error('AUTH_REQUIRED');
  const p=await identityProvider.verify(token);
  if(!p?.ownerId||p.sessionId!==sessionId||!p.roles?.includes('OWNER_ROOT')
    ||!p.authorizedCompanies?.includes(companyId))throw Error('OWNER_SCOPE_DENIED');
  const c=await controlStore.get({companyId,environment});
  if(c?.enabled!==true||c?.killSwitch!==false)throw Error('B5_LOCKED');
  if(await consentStore.check({ownerId:p.ownerId,companyId,sessionId,consentRef,purpose:operation})!==true)
   throw Error('VOICE_CONSENT_REQUIRED');
  const granted=await b3PolicyService.authorize({token,companyId,environment,actionName:'JARVIS_VOICE_'+operation});
  if(granted?.decision!=='ALLOW')throw Error('B3_VOICE_POLICY_DENIED');
  // Fail closed before any adapter call, including potential metered compute.
  const audited=await auditStore.append({eventCode:'VOICE_'+operation+'_REQUESTED',companyId,environment,sessionId});
  if(audited!==true)throw Error('AUDIT_UNAVAILABLE');
 }
 async function transcribe({token,companyId,environment='LAB',sessionId,consentRef,audioRef}={}){
  safeId(audioRef,'AUDIO_REF');
  await authorize({token,companyId,environment,sessionId,consentRef,operation:'STT'});
  if(sttAdapter?.provider!=='LOCAL'||typeof sttAdapter.transcribe!=='function')throw Error('SAFE_STT_ADAPTER_UNAVAILABLE');
  const r=await sttAdapter.transcribe({audioRef,locale:'es-ES'});
  if(typeof r?.text!=='string'||r.text.length>2000||r.text.length===0)throw Error('STT_RESULT_INVALID');
  if(sensitive.test(r.text))throw Error('STT_SENSITIVE_CONTENT_BLOCKED');
  return Object.freeze({text:r.text,channel:'VOICE_STT',locale:'es-ES',persisted:false});
 }
 async function synthesize({token,companyId,environment='LAB',sessionId,consentRef,text}={}){
  if(typeof text!=='string'||text.length===0||text.length>1500||sensitive.test(text))
   throw Error('TTS_TEXT_REJECTED');
  await authorize({token,companyId,environment,sessionId,consentRef,operation:'TTS'});
  if(ttsAdapter?.provider!=='LOCAL'||typeof ttsAdapter.synthesize!=='function')throw Error('SAFE_TTS_ADAPTER_UNAVAILABLE');
  const result=await ttsAdapter.synthesize({text,locale:'es-ES'});
  safeId(result?.audioRef,'AUDIO_REF');
  return Object.freeze({audioRef:result.audioRef,locale:'es-ES',persisted:false});
 }
 return Object.freeze({transcribe,synthesize});
}
