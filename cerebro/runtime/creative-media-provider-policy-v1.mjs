/**
 * CEREBRO FACT-001 · Media economics and provider router V1.
 * OWNER POLICY (2026-11-05): "zero additional cost" applies to ordinary
 * engines; it does NOT prohibit paid images or paid videos.
 * Paid images: existing OpenAI account first. FLUX1.1 Pro: future candidate.
 * Paid video: category permitted, no contracted API yet.
 * Always prefer acceptable visual quality for the lower total cost.
 *
 * Pure code; quotations are external verified evidence, never model guesses.
 * Live costs require budget reservation and provider reconciliation.
 */
export const MEDIA_SPEND_POLICY_V1=Object.freeze({
  company_id:'fenix-capital',owner_engine:'FACT-001',version:'v1',
  ordinary_engines_zero_additional_cost_first:true,
  images:{paid_api_allowed:true,active_initial_provider:'OPENAI',subscriptions_required:false,
    ranking:'LOWEST_EXPECTED_TOTAL_COST_THAT_PASSES_INDEPENDENT_QUALITY_GATE',
    bounded_budget_required:true,unit:'PER_GENERATED_IMAGE',billable_cost_reconciliation_required:true},
  videos:{paid_api_allowed:true,provider_contracted:false,selection_status:'HOLD_UNTIL_API_CONNECTED',
    bounded_budget_required:true,no_auto_contracting:true},
  human_exception_only_when:['MONEY_LIMIT','SECURITY_INCIDENT','POLICY_CONFLICT','LOW_CONFIDENCE','HIGH_RISK'],
  external_publication_not_granted:true,never_mark_paid_images_as_zero_eur:true
});
export const MEDIA_PROVIDER_REGISTRY_V1=Object.freeze([
  Object.freeze({provider_id:'OPENAI',model_id:'gpt-image-2.5-flare',
    media_kind:'IMAGE',status:'INITIAL_CONFIGURED_TARGET_CONNECTION_TO_VERIFY',
    quote_unit:'PER_IMAGE_ESTIMATED_TOKENS',secret_key_ref:'OPENAI_API_KEY',
    adapter:'cerebro/runtime/creative-openai-image-adapter-v0.mjs',
    api_reference:'https://developers.openai.com/api/reference/resources/images/methods/generate'}),
  Object.freeze({provider_id:'BFL',model_id:'flux-pro-1.1',
    media_kind:'IMAGE',status:'FUTURE_CANDIDATE_NOT_CONNECTED',
    quote_unit:'PER_IMAGE_USD',secret_key_ref:'BFL_API_KEY',
    publicly_listed_price_usd_per_image:0.04,
    api_reference:'https://help.bfl.ai/articles/7655484417-what-flux-models-are-available'}),
  Object.freeze({provider_id:'VIDEO',model_id:null,
    media_kind:'VIDEO',status:'FUTURE_API_NOT_CONTRACTED',
    quote_unit:null,api_reference:null})
]);

function finiteNonnegative(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0;}
function score(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;}

export function chooseMediaProvider({
 media_kind,offers=[],min_quality_score=80,require_live_verified_price=true,
 approved_max_eur_per_asset=null,fx_usd_eur=null
}={}){
 if(!['IMAGE','VIDEO'].includes(media_kind))return Object.freeze({ok:false,status:'INVALID_MEDIA_KIND'});
 if(media_kind==='VIDEO'&&!MEDIA_SPEND_POLICY_V1.videos.provider_contracted)
   return Object.freeze({ok:false,status:'HOLD_VIDEO_PROVIDER_NOT_CONTRACTED',spend_requested:false});
 if(!score(min_quality_score))return Object.freeze({ok:false,status:'INVALID_QUALITY_THRESHOLD'});
 const reasons=[];
 const candidates=[];
 for(const item of offers){
  const registry=MEDIA_PROVIDER_REGISTRY_V1.find(p=>p.provider_id===item.provider_id && p.model_id===item.model_id && p.media_kind===media_kind);
  if(!registry){reasons.push('UNREGISTERED_PROVIDER');continue;}
  if(registry.status!=='INITIAL_CONFIGURED_TARGET_CONNECTION_TO_VERIFY'&&registry.status!=='ACTIVE_VERIFIED'){
    reasons.push('PROVIDER_NOT_CONNECTED_'+item.provider_id);continue;
  }
  if(item.connection_verified!==true){reasons.push('CONNECTION_NOT_VERIFIED_'+item.provider_id);continue;}
  if(item.independent_quality_qa_passed!==true||!score(item.quality_score)||item.quality_score<min_quality_score){
    reasons.push('QUALITY_NOT_CERTIFIED_'+item.provider_id);continue;
  }
  if(require_live_verified_price&&item.quote_verified!==true){
    reasons.push('PRICE_NOT_VERIFIED_'+item.provider_id);continue;
  }
  // Never compare USD and EUR as though they were equal.
  let eur=item.estimated_total_cost_eur;
  if(!finiteNonnegative(eur)&&finiteNonnegative(item.estimated_total_cost_usd)
      &&finiteNonnegative(fx_usd_eur)&&fx_usd_eur>0)eur=item.estimated_total_cost_usd*fx_usd_eur;
  if(!finiteNonnegative(eur)||eur===0){reasons.push('UNPRICED_PROVIDER_'+item.provider_id);continue;}
  if(!finiteNonnegative(approved_max_eur_per_asset)||eur>approved_max_eur_per_asset){
    reasons.push('MONEY_LIMIT_'+item.provider_id);continue;
  }
  candidates.push({provider_id:item.provider_id,model_id:item.model_id,
    expected_cost_eur:eur,quality_score:item.quality_score,
    quote_ref:item.quote_ref??null,grade_ref:item.grade_ref??null});
 }
 candidates.sort((a,b)=>a.expected_cost_eur-b.expected_cost_eur||b.quality_score-a.quality_score);
 if(candidates.length===0)return Object.freeze({
  ok:false,status:'HOLD_NO_QUALIFIED_PROVIDER',reasons:[...new Set(reasons)],
  money_limit_human_required:reasons.some(x=>x.startsWith('MONEY_LIMIT_')),
  provider_activation_forbidden:true
 });
 const best=candidates[0];
 return Object.freeze({ok:true,status:'PROVIDER_SELECTED_NOT_EXECUTED',...best,
   spend_reserved:false,needs_atomic_budget_reservation:true,
   publish_authorized:false,candidates_compared:candidates.length,
   decision_rule:'CHEAPEST_QUALIFIED_NOT_CHEAPEST_UNCONDITIONALLY'});
}

export function mediaCostPolicyFor(kind){
 if(kind==='IMAGE')return MEDIA_SPEND_POLICY_V1.images;
 if(kind==='VIDEO')return MEDIA_SPEND_POLICY_V1.videos;
 return {paid_api_allowed:false,zero_additional_cost_first:true};
}
