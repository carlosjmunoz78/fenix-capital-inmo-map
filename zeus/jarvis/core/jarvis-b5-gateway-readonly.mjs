/** ZEUS/JARVIS B5 CUT04 — SERVER-ONLY Gateway integration seam (LAB).
 * This is NOT a deployed endpoint, speech provider or executable agent.
 * Keeps the App voice UI and prior Gateway unchanged. NO model invocation / mutation / billing.
 * Only trusted server dependencies may verify identity and classify privacy.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const ENV=new Set(['LAB','PREPROD','PROD']);
const CHANNELS=new Set(['TEXT','VOICE_STT']);
const PRIVACIES=new Set(['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED']);
const validId=x=>typeof x==='string'&&ID.test(x);
const safe=(state,reason,extra={})=>Object.freeze({
 state,reason,mayExecute:false,modelCalled:false,spentEuro:0,...extra
});
export function createJarvisB5GatewayReadOnly({controlStore,rateLimiter,previewService,privacyResolver,modelRouter}={}){
 if(typeof controlStore?.get!=='function'||typeof rateLimiter?.allow!=='function'||
  typeof previewService?.preview!=='function'||typeof privacyResolver?.classify!=='function'||
  typeof modelRouter?.choose!=='function')throw Error('B5_GATEWAY_SERVER_DEPENDENCIES_REQUIRED');
 return Object.freeze({async handle(r={}){
  if(!r||typeof r!=='object'||Array.isArray(r)||r.version!=='B5_READONLY_V0'||
   !validId(r.requestId)||!validId(r.companyId)||!validId(r.projectId)||
   !validId(r.sessionId)||(r.missionId!==null&&r.missionId!==undefined&&!validId(r.missionId))||
   !ENV.has(r.environment)||!CHANNELS.has(r.channel)||typeof r.text!=='string'||
   r.text.length===0||r.text.length>2000||r.channel==='VOICE_STT'&&
   (typeof r.isFinal!=='boolean'||r.confidence!==null&&
    (typeof r.confidence!=='number'||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1)))
   return safe('DENY','REQUEST_INVALID');
  // Do not trust request.featureEnabled, claimed roles, client privacy, paid-model settings.
  let ctl;
  try{ctl=await controlStore.get({companyId:r.companyId,environment:r.environment});}
  catch{return safe('DENY','CONTROL_UNAVAILABLE');}
  if(ctl?.enabled!==true||ctl?.killSwitch!==false)return safe('DENY','FEATURE_OFF');
  let pass;
  try{pass=await rateLimiter.allow({companyId:r.companyId,environment:r.environment,
    sessionId:r.sessionId,requestId:r.requestId,capability:'B5_READONLY_PREVIEW'});}
  catch{return safe('DENY','RATE_LIMIT_UNAVAILABLE');}
  if(pass!==true)return safe('DENY','RATE_LIMITED');
  // The preview boundary verifies B2 owner/session and B3 grant; no client claims are forwarded.
  let p;
  try{p=await previewService.preview({
   token:r.token,companyId:r.companyId,projectId:r.projectId,environment:r.environment,
   sessionId:r.sessionId,missionId:r.missionId??null,channel:r.channel,text:r.text,
   isFinal:r.channel==='VOICE_STT'?r.isFinal:true,
   confidence:r.channel==='VOICE_STT'?r.confidence:null,
   pendingAction:r.channel==='VOICE_STT'?r.pendingAction===true:false
  });}catch{return safe('DENY','PREVIEW_UNAVAILABLE');}
  if(!p||p.mayExecute!==false||p.modelCalled!==false||p.spentEuro!==0)
   return safe('DENY','PREVIEW_CONTRACT_INVALID');
  if(p.state!=='PREVIEW_ONLY')
   return safe(p.state,p.reason,{intentKind:p.intentKind??null});
  let privacy;
  try{const v=await privacyResolver.classify({text:r.text,companyId:r.companyId,environment:r.environment});
    privacy=v?.privacy;}catch{return safe('DENY','PRIVACY_CLASSIFIER_UNAVAILABLE');}
  if(!PRIVACIES.has(privacy))return safe('DENY','PRIVACY_NOT_VERIFIED');
  let m;
  try{m=await modelRouter.choose({companyId:r.companyId,environment:r.environment,
   capability:'LANGUAGE',privacy,maxCallEuro:0,allowPaid:false});}
  catch{return safe('DENY','ROUTER_UNAVAILABLE');}
  // A selected LOCAL model is only an adapter CANDIDATE; this seam never invokes it.
  const localCandidate=m?.state==='ADAPTER_CANDIDATE'&&m.provider==='LOCAL'&&
    m.companyId===r.companyId&&m.environment===r.environment&&m.estimatedEuro===0&&
    m.executed===false&&m.spentEuro===0;
  if(!m||m.state!=='DENY'&&!localCandidate)
   return safe('DENY','ROUTER_CONTRACT_INVALID');
  return safe('PREVIEW_ONLY','NO_EXECUTOR_WIRED',{
   intentKind:p.intentKind??null,dialogueStatus:p.dialogueStatus??null,
   answer:typeof p.answer==='string'?p.answer:null,
   routing:localCandidate?'LOCAL_CANDIDATE_NOT_EXECUTED':'NO_PROVIDER_FALLBACK'
  });
 }});
}
