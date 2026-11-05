/**
 * ZEUS/JARVIS B5 - VOICE-001 central omnidevice voice identity contract.
 * This is a policy evaluator, NOT a live voice engine, proxy or deployment.
 * CEREBRO produces voice centrally once per response; every authenticated
 * device plays returned private audio. Device hardware is not a TTS provider.
 * App Fenix Capital (except the embedded /cerebro console) retains ANA.
 */
const COMPANY=/^[a-z][a-z0-9_-]{0,63}$/;
const VIEWS=new Set(['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR','V0']);
const DEVICES=new Set(['desktop','mobile','tablet']);
const INSTALLED_CHANNELS=new Set(['CEREBRO_WEB_CONSOLE']);
const FUTURE_CHANNELS=new Set(['CEREBRO_COMMUNICATION_APP']);
const deny=(reason)=>Object.freeze({state:'DENY',reason,voiceOwner:null,
 profileId:null,outputMode:null,synthesisAuthorized:false,requiresGateway:true});
export function resolveCentralJarvisVoiceSurface({
 companyId,channel,pathname,view='JARVIS',device='desktop',
 sessionVerifiedByGateway=false,communicationAppReleased=false,
 providerRuntimeVerified=false,clientVoiceId=null
}={}){
 if(!COMPANY.test(String(companyId||''))||!DEVICES.has(device)||
   !['CEREBRO_WEB_CONSOLE','CEREBRO_COMMUNICATION_APP','FENIX_APP'].includes(channel))
  return deny('SCOPE_INVALID');
 const path=typeof pathname==='string'?pathname.replace(/\/+$/,'')||'/':null;
 if(!path||!path.startsWith('/')||path.startsWith('//')||path.includes('..')||
    path.includes('?')||path.includes('#'))return deny('PATH_INVALID');
 if(channel==='FENIX_APP'&&path!=='/cerebro')
  return Object.freeze({state:'LEGACY_PRESERVED',reason:'APP_FENIX_ANA_ONLY',
   voiceOwner:'ANA',profileId:'ANA_FENIX_FINANCE_ES_ES_V1',outputMode:'EXISTING_APP_VOICE',
   synthesisAuthorized:false,requiresGateway:false});
 if((channel==='CEREBRO_WEB_CONSOLE'||channel==='FENIX_APP')&&path!=='/cerebro')
  return deny('CEREBRO_ROUTE_REQUIRED');
 if(FUTURE_CHANNELS.has(channel)&&!communicationAppReleased)
  return deny('COMMUNICATION_APP_NOT_YET_RELEASED');
 if(INSTALLED_CHANNELS.has(channel)||channel==='FENIX_APP'){
  if(!VIEWS.has(view))return deny('CEREBRO_VIEW_NOT_RECOGNIZED');
 }
 if(clientVoiceId!==null&&clientVoiceId!=='JARVIS_V2_CLARA_ES_ES')
  return deny('CLIENT_VOICE_OVERRIDE_BLOCKED');
 if(sessionVerifiedByGateway!==true)return deny('GATEWAY_SESSION_NOT_VERIFIED');
 if(providerRuntimeVerified!==true)return Object.freeze({
  state:'LAB_READY_NOT_SPEAKING',reason:'SHARED_TTS_RUNTIME_NOT_YET_VERIFIED',
  voiceOwner:'JARVIS',profileId:'JARVIS_V2_CLARA_ES_ES',
  preset:'MAS_CLARA_1_10X',outputMode:'PRIVATE_AUDIO_FROM_SHARED_GATEWAY',
  synthesisAuthorized:false,requiresGateway:true,deviceIndependent:true
 });
 return Object.freeze({
  state:'READY_FOR_SERVER_AUTHORIZATION',reason:'B2_B3_CONSENT_AND_QUOTA_STILL_REQUIRED',
  voiceOwner:'JARVIS',profileId:'JARVIS_V2_CLARA_ES_ES',
  preset:'MAS_CLARA_1_10X',outputMode:'PRIVATE_AUDIO_FROM_SHARED_GATEWAY',
  synthesisAuthorized:false,requiresGateway:true,deviceIndependent:true
 });
}
