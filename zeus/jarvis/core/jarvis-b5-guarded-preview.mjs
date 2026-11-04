/** ZEUS/JARVIS B5 CUT03 — server-only, fail-closed preview boundary.
 * Does NOT connect to the App, Gateway, models, audio devices or PROD.
 * Wraps existing B5 compiler / browser voice adapter / dialogue.
 * Real B2 verifier and B3 grants must be injected server-side, never from browser claims.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const VALID_ENV=new Set(['LAB','PREPROD','PROD']);
const VALID_CHANNEL=new Set(['TEXT','VOICE_STT']);
const safeId=x=>typeof x==='string'&&ID.test(x);
const reply=(state,reason=null,extra={})=>Object.freeze({state,reason,mayExecute:false,spentEuro:0,modelCalled:false,...extra});

export function createJarvisB5GuardedPreview({identityProvider,controlStore,b3PolicyService,auditStore,compileIntent,adaptVoice,dialogue}={}){
 if(typeof identityProvider?.verify!=='function'||typeof controlStore?.get!=='function'||
    typeof b3PolicyService?.authorize!=='function'||typeof auditStore?.append!=='function'||
    typeof compileIntent!=='function'||typeof adaptVoice!=='function'||
    typeof dialogue?.respond!=='function')throw Error('B5_TRUSTED_SERVER_DEPENDENCIES_REQUIRED');

 async function preview({token,companyId,projectId,environment='LAB',sessionId,missionId=null,
  channel='TEXT',text,confidence=null,isFinal=true,pendingAction=false}={}){
  if(!safeId(companyId)||!safeId(projectId)||!safeId(sessionId)||
    (missionId!==null&&!safeId(missionId))||!VALID_ENV.has(environment)||!VALID_CHANNEL.has(channel)||
    typeof text!=='string'||text.length===0||text.length>2000||
    (channel==='VOICE_STT'&&(typeof isFinal!=='boolean'||(confidence!==null&&
      (typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)))))
    return reply('DENY','REQUEST_INVALID');
  if(channel==='VOICE_STT'&&!isFinal)return reply('INTERIM_IGNORED','AWAIT_FINAL_TRANSCRIPT');
  let voice=null;
  try{
   if(channel==='VOICE_STT'){
    voice=adaptVoice({transcript:text,confidence,isFinal,pendingAction,companyId,projectId,missionId});
    if(voice?.state==='STOP_AUDIO_LOCAL')return reply('STOP_AUDIO_LOCAL','USER_INTERRUPTION');
   }
  }catch{return reply('DENY','VOICE_INPUT_INVALID');}
  if(!token)return reply('DENY','AUTH_REQUIRED');
  let principal;
  try{principal=await identityProvider.verify(token);}
  catch{return reply('DENY','AUTH_UNAVAILABLE');}
  if(!principal?.ownerId||principal.sessionId!==sessionId||
    !Array.isArray(principal.authorizedCompanies)||!principal.authorizedCompanies.includes(companyId)||
    !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT'))
    return reply('DENY','OWNER_SCOPE_DENIED');
  let control;
  try{control=await controlStore.get({companyId,environment});}
  catch{return reply('DENY','B5_CONTROL_UNAVAILABLE');}
  if(control?.enabled!==true||control?.killSwitch!==false)return reply('DENY','B5_LOCKED');
  let grant;
  try{grant=await b3PolicyService.authorize({token,companyId,environment,actionName:'JARVIS_INTENT_PREVIEW'});}
  catch{return reply('DENY','B3_POLICY_UNAVAILABLE');}
  if(grant?.decision!=='ALLOW')return reply('DENY','B3_POLICY_DENIED');
  let intent;
  try{intent=compileIntent({text,channel,companyId,projectId,missionId});}
  catch{return reply('DENY','INTENT_INVALID');}
  if(!intent||intent.mayExecute!==false||intent.companyId!==companyId||intent.projectId!==projectId)
   return reply('DENY','INTENT_CONTRACT_INVALID');
  const state=voice?.state==='CONFIRMATION_REQUIRED'?'CONFIRMATION_REQUIRED':
   voice?.state==='CLARIFY'?'CLARIFY':voice?.state==='HUMAN_REQUIRED'||intent.requiresHuman?'HUMAN_REQUIRED':
   voice?.state==='REJECTED'||intent.kind==='REJECTED'?'REJECTED':
   intent.needsClarification?'CLARIFY':'PREVIEW_ONLY';
  let saved;
  try{saved=await auditStore.append({eventCode:'B5_INTENT_PREVIEW',companyId,environment,
   sessionId,channel,kind:intent.kind,outcome:state});}
  catch{return reply('DENY','AUDIT_UNAVAILABLE');}
  if(saved!==true)return reply('DENY','AUDIT_UNAVAILABLE');
  if(state!=='PREVIEW_ONLY')return reply(state,
   state==='HUMAN_REQUIRED'?'HIGH_RISK':state==='CLARIFY'?(voice?.reason||intent.clarification):
   state==='REJECTED'?'SENSITIVE_INPUT':(voice?.reason||'B3_MANDATORY_APPROVAL'),
   {intentKind:intent.kind});
  let answer;
  try{answer=await dialogue.respond({intent,evidence:[]});}
  catch{return reply('DENY','DIALOGUE_UNAVAILABLE');}
  if(!answer||typeof answer.text!=='string'||answer.executed!==false)
   return reply('DENY','DIALOGUE_CONTRACT_INVALID');
  return reply('PREVIEW_ONLY','EXECUTION_NOT_CONNECTED',{
   intentKind:intent.kind,dialogueStatus:answer.status,answer:answer.text
  });
 }
 return Object.freeze({preview});
}
