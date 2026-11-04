/** JARVIS B5 · capability-based router preview (NO PROVIDER API CALLS).
 * Trusted server-side catalog only; never executes, debits, reserves or reveals secrets.
 * The live executor needs B2/B3 identity, permission, atomic budget reservation and audit.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const CAPABILITIES=new Set(['LANGUAGE','REASONING','VOICE_STT','VOICE_TTS']);
const PRIVACIES=new Set(['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED']);
const PROVIDERS=new Set(['LOCAL','DEEPSEEK','EXTERNAL']);
const validMoney=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000;
const denied=(reason,companyId,capability)=>Object.freeze({state:'DENY',reason,companyId,capability,executed:false,spentEuro:0});
const snapshot=x=>Object.freeze({...x});
export function createJarvisB5ModelRouter({catalog=[],balanceProof=null,budgetStore=null,hardCeilingEuro=50}={}){
 if(!Array.isArray(catalog)||catalog.length>50)throw Error('CATALOG_INVALID');
 if(!validMoney(hardCeilingEuro)||hardCeilingEuro>50)throw Error('HARD_CEILING_EXCEEDS_MANDATE');
 const ids=new Set();
 const models=catalog.map(c=>{
  if(!c||typeof c.id!=='string'||!ID.test(c.id)||ids.has(c.id))throw Error('CATALOG_ID_INVALID');
  if(!PROVIDERS.has(c.provider)||!Array.isArray(c.capabilities)||!c.capabilities.length
     ||c.capabilities.some(s=>!CAPABILITIES.has(s))
     ||!validMoney(c.estimatedEuroPerCall)||typeof c.healthy!=='boolean')throw Error('CATALOG_PROVIDER_INVALID');
  if(c.provider==='DEEPSEEK'&&c.capabilities.some(v=>v==='VOICE_STT'||v==='VOICE_TTS'))throw Error('DEEPSEEK_SPEECH_UNSUPPORTED');
  ids.add(c.id);return snapshot({id:c.id,provider:c.provider,capabilities:[...c.capabilities],estimatedEuroPerCall:c.estimatedEuroPerCall,healthy:c.healthy});
 });
 return Object.freeze({
  async choose({companyId,environment='LAB',capability='LANGUAGE',privacy='INTERNAL',maxCallEuro=0,allowPaid=false}={}){
   if(typeof companyId!=='string'||!ID.test(companyId)||!['LAB','PROD','PREPROD'].includes(environment)
      ||!CAPABILITIES.has(capability)||!PRIVACIES.has(privacy)||!validMoney(maxCallEuro))
    return denied('REQUEST_INVALID',companyId,capability);
   const local=models.filter(m=>m.healthy&&m.provider==='LOCAL'&&m.capabilities.includes(capability));
   if(local.length){
    const selected=local.sort((a,b)=>a.estimatedEuroPerCall-b.estimatedEuroPerCall||a.id.localeCompare(b.id))[0];
    if(selected.estimatedEuroPerCall!==0)return denied('LOCAL_COST_NOT_ZERO_VERIFIED',companyId,capability);
    return snapshot({state:'ADAPTER_CANDIDATE',modelId:selected.id,provider:'LOCAL',companyId,environment,
      capability,privacy,estimatedEuro:selected.estimatedEuroPerCall,
      executionRequiresB3Authorization:true,executed:false,spentEuro:0});
   }
   if(privacy==='CONFIDENTIAL'||privacy==='RESTRICTED')return denied('NO_PRIVATE_PROVIDER',companyId,capability);
   if(!allowPaid)return denied('PAID_MODEL_OPT_IN_REQUIRED',companyId,capability);
   const paid=models.filter(m=>m.healthy&&m.provider==='DEEPSEEK'&&m.capabilities.includes(capability));
   if(!paid.length){
    if(models.some(m=>m.healthy&&m.provider==='EXTERNAL'&&m.capabilities.includes(capability)))
      return denied('EXTERNAL_PROVIDER_NOT_AUTHORIZED',companyId,capability);
    return denied('NO_PROVIDER_AVAILABLE',companyId,capability);
   }
   const chosen=paid.sort((a,b)=>a.estimatedEuroPerCall-b.estimatedEuroPerCall||a.id.localeCompare(b.id))[0];
   // Only DeepSeek prepaid credit was authorized; other paid providers require a separate mandate.
   if(chosen.provider!=='DEEPSEEK')return denied('EXTERNAL_PROVIDER_NOT_AUTHORIZED',companyId,capability);
   // Credit is not proof of an actual usable authorization or a spendable balance.
   const proofAgeMs=Date.now()-Date.parse(balanceProof?.checkedAt);
   if(!balanceProof?.verified||balanceProof.provider!=='DEEPSEEK'||balanceProof.currency!=='EUR'||!validMoney(balanceProof.availableEuro)
      ||balanceProof.companyId!==companyId||balanceProof.environment!==environment
      ||!Number.isFinite(proofAgeMs)||proofAgeMs<0||proofAgeMs>15*60*1000)
    return denied('BALANCE_NOT_VERIFIED',companyId,capability);
   if(!budgetStore||typeof budgetStore.getVerifiedSpend!=='function'
      ||typeof budgetStore.reserveAtomically!=='function')
    return denied('ATOMIC_SPEND_GUARD_MISSING',companyId,capability);
   let spent;
   try{const r=await budgetStore.getVerifiedSpend({companyId,environment});
    if(r?.verified!==true||!validMoney(r.spentEuro)||r.companyId!==companyId||r.environment!==environment)
      return denied('SPEND_NOT_VERIFIED',companyId,capability);
    spent=r.spentEuro;
   }catch{return denied('SPEND_READ_UNAVAILABLE',companyId,capability);}
   const cap=Math.min(hardCeilingEuro,balanceProof.availableEuro);
   if(chosen.estimatedEuroPerCall>maxCallEuro||spent+chosen.estimatedEuroPerCall>cap)
    return denied('COST_HARD_STOP',companyId,capability);
   // Preview only: the external executor must atomically reserve against *its* live ledger
   // immediately before the API call, handle rollbacks and reconcile actual provider charges.
   return snapshot({state:'PAID_CANDIDATE_NOT_EXECUTED',modelId:chosen.id,provider:chosen.provider,
    companyId,environment,capability,privacy,estimatedEuro:chosen.estimatedEuroPerCall,
    remainingPreviewEuro:Math.max(0,cap-spent),hardCeilingEuro:cap,
    requiresAtomicReservation:true,executionRequiresB3Authorization:true,executed:false,spentEuro:0});
  }
 });
}
