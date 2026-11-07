/**
 * CEREBRO · VOICE-001 · Online generic Spanish TTS adapter (LAB ONLY).
 *
 * Cloudflare Workers AI Free provides a daily allocation shared with all
 * Workers AI models. This is NOT the approved cloned JARVIS V2 voice.
 * The exact JARVIS clone/provider remains disabled until physically licensed,
 * tested and connected. This file is a logical adapter, not a new Worker.
 *
 * Never expose AI binding, owner credentials, private texts or audio publicly.
 * No inference without independent tenant B2/B3, consent, privacy and an
 * atomic shared *free* quota attestation. No paid overflow, no auto-topup.
 */
export const JARVIS_CLOUDFLARE_GENERIC_FREE_V0=Object.freeze({
  company_id:"fenix",
  engine_id:"VOICE-001",
  environment:"LAB",
  version:"online-cloudflare-generic-es-v0",
  provider:"CLOUDFLARE_WORKERS_AI",
  model:"@cf/deepgram/aura-2-es",
  speaker:"javier",
  locale:"es-ES",
  canonicalJarvisV2:false,
  voiceProfileId:"GENERIC_SPANISH_MALE_NOT_JARVIS_V2",
  minimumRights:"CLOUDFLARE_MODEL_TERMS_UNDER_REVIEW",
  dailyFreeNeuronsShared:10_000,
  neuronConservativePerCharacter:3,
  maxCharactersPerRequest:400,
  defaultEnabled:false,
  autoTopup:false,
  allowPaidOverage:false,
  productionAuthorized:false,
  noNewWorkerRequired:true
});

const SENSITIVE=/(password|contrase[nñ]a|\btoken\b|bearer|api[_ -]?key|secreto|n[úu]mero de tarjeta|\biban\b)/i;
const allowedSurfaces=new Set(["JARVIS","OPERATIVA","NEURONAL","NAVEGADOR","LEGACY_V0"]);
const deny=(reason)=>Object.freeze({state:"DENY",reason,providerCalled:false,spentEuro:0,canonicalJarvisV2:false});
const t=(x)=>typeof x==="string"&&x.length>0&&x.length<=180;
const isByteArray=(x)=>x instanceof Uint8Array&&x.byteLength>=100&&x.byteLength<=5_000_000;

/** Never load an unlimited remote stream into Worker RAM. */
export async function boundedMp3(input,limit=5_000_000){
  if(isByteArray(input))return input;
  const value=input?.audio??input;
  if(value instanceof ArrayBuffer){
    const bytes=new Uint8Array(value);
    if(!isByteArray(bytes))throw Error("AUDIO_SIZE_INVALID");
    return bytes;
  }
  if(isByteArray(value))return value;
  if(typeof value?.getReader!=="function")throw Error("AUDIO_TYPE_INVALID");
  const reader=value.getReader(),parts=[];
  let length=0;
  try{
    for(;;){
      const r=await reader.read();
      if(r.done)break;
      if(!(r.value instanceof Uint8Array))throw Error("AUDIO_CHUNK_INVALID");
      length+=r.value.length;
      if(length>limit)throw Error("AUDIO_TOO_LARGE");
      parts.push(r.value);
    }
    if(length<100)throw Error("AUDIO_TOO_SMALL");
    const result=new Uint8Array(length);
    let offset=0;
    for(const part of parts){result.set(part,offset);offset+=part.length}
    return result;
  }finally{try{reader.releaseLock()}catch{}}
}

/**
 * All deps are server-provided; no client-supplied permissions or quota.
 * quota.reserveFree MUST atomically check other Workers AI consumption
 * in the same Cloudflare account, not only this feature's usage.
 */
export function createJarvisOnlineFreeTtsPort({
  identity,policy,consent,privacy,quota,ai,audit,control
}={}){
  const deps=[
    [identity,"verifyOwner"],[policy,"authorize"],[consent,"check"],
    [privacy,"classify"],[quota,"reserveFree"],[quota,"commit"],
    [quota,"release"],[ai,"run"],[audit,"record"],[control,"read"]
  ];
  if(deps.some(([object,method])=>typeof object?.[method]!=="function"))
    throw Error("SERVER_GATES_MISSING");
  async function synthesize(request={}){
    if(!request||typeof request!=="object"||Array.isArray(request))return deny("INVALID_REQUEST");
    if(request.environment!==undefined||request.ownerId!==undefined||
      request.role!==undefined||request.voiceId!==undefined||
      request.allowPaid!==undefined||request.model!==undefined)return deny("PRIVILEGED_FIELDS_DENIED");
    const {jwt,company_id,engine_id,surface,session_id,request_id,text,consent_ref}=request;
    if(company_id!=="fenix"||engine_id!=="VOICE-001"||
       !allowedSurfaces.has(surface)||!t(jwt)||!t(session_id)||!t(request_id)||!t(consent_ref)||
       typeof text!=="string"||!text.trim()||text.length>400)return deny("INVALID_SCOPE_OR_TEXT");
    if(SENSITIVE.test(text))return deny("SENSITIVE_TEXT_DENIED");
    // Never trust the browser-selected voice name to infer a cloned model.
    let owner,settings;
    try{
      owner=await identity.verifyOwner(jwt);
      if(owner?.role!=="OWNER_ROOT"||owner.session_id!==session_id||
         !Array.isArray(owner.company_ids)||!owner.company_ids.includes(company_id))
        return deny("OWNER_SCOPE_DENIED");
      settings=await control.read({company_id,engine_id,environment:"LAB"});
      if(settings?.enabled!==true||settings?.kill_switch!==false||
         settings?.generic_fallback_opt_in!==true||settings?.allowPaid===true)
        return deny("GENERIC_FALLBACK_OFF");
      if(await consent.check({owner_id:owner.owner_id,company_id,session_id,consent_ref,purpose:"GENERIC_TTS"})!==true)
        return deny("VOICE_CONSENT_REQUIRED");
      const p=await policy.authorize({owner,company_id,engine_id,surface,environment:"LAB",action:"VOICE_GENERIC_TTS"});
      if(p?.decision!=="ALLOW")return deny("B3_DENY");
      const data=await privacy.classify({company_id,text,environment:"LAB"});
      if(data?.classification!=="PUBLIC")return deny("PRIVATE_CONTENT_REQUIRES_CANONICAL_LOCAL");
    }catch{return deny("OWNER_OR_POLICY_UNAVAILABLE")}
    // Documentation: 2,727.27 neurons / 1,000 chars.
    // Reserve 3 neurons / character (conservative) against 10,000 shared
    // neurons/day. The provider must be hard-capped to FREE, not merely
    // charged to existing payment methods.
    const maxNeurons=Math.ceil(text.length*JARVIS_CLOUDFLARE_GENERIC_FREE_V0.neuronConservativePerCharacter);
    let hold,providerCalled=false;
    try{
      hold=await quota.reserveFree({
        accountWide:true,model:JARVIS_CLOUDFLARE_GENERIC_FREE_V0.model,
        request_id,maxNeurons,dailyCap:10_000,paidOverflowAllowed:false,
        requireCloudflareFreePlanAttestation:true
      });
      if(hold?.state!=="HELD"||hold?.fresh!==true||
         hold?.accountWideFreeBudgetVerified!==true||hold?.paidOverflowAllowed!==false||
         !t(hold?.reservation_id)||hold?.reservedNeurons!==maxNeurons)
        return deny("UNVERIFIED_SHARED_FREE_QUOTA");
      const ok=await audit.record({event:"GENERIC_TTS_FREE_ATTEMPT",company_id,engine_id,environment:"LAB",request_id,canonical:false});
      if(ok!==true){await quota.release(hold.reservation_id);return deny("AUDIT_UNAVAILABLE")}
      providerCalled=true;
      const output=await ai.run(JARVIS_CLOUDFLARE_GENERIC_FREE_V0.model,{
        text,speaker:"javier",encoding:"mp3"
      });
      const bytes=await boundedMp3(output);
      const committed=await quota.commit({reservation_id:hold.reservation_id,request_id,maxNeurons});
      if(committed!==true)throw Error("BUDGET_COMMIT_UNVERIFIED");
      await audit.record({event:"GENERIC_TTS_FREE_READY",company_id,environment:"LAB",request_id,canonical:false});
      return Object.freeze({
        state:"AUDIO_BYTES_READY",providerCalled:true,spentEuro:0,
        bytes,contentType:"audio/mpeg",cacheControl:"private, no-store",
        voiceProfileId:"GENERIC_SPANISH_MALE_NOT_JARVIS_V2",
        canonicalJarvisV2:false,freeNeuronReservation:maxNeurons
      });
    }catch{
      if(hold?.reservation_id){try{await quota.release(hold.reservation_id)}catch{}}
      return Object.freeze({
        state:"DENY",reason:"FREE_TTS_OR_ACCOUNTING_FAILED",
        providerCalled,spentEuro:providerCalled?null:0,
        reconciliationRequired:providerCalled,canonicalJarvisV2:false
      });
    }
  }
  return Object.freeze({synthesize,profile:JARVIS_CLOUDFLARE_GENERIC_FREE_V0});
}
