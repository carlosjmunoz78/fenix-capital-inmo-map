/** CUT35 LAB. DeepSeek live balance fallback, read-only fail-closed guard.
 * Baseline observed on 2026-11-06 in owner's DeepSeek dashboard:
 * 98.23 USD. This is NOT a provider-side spending cap and not EUR conversion.
 * At most 40 USD decline from reference, considering ALL account users.
 */
export const JARVIS_DEEPSEEK_BALANCE_BASELINE=Object.freeze({
 currency:'USD',initial_total_balance_usd:98.23,delta_cap_usd:40,
 observed_at:'2026-11-06',owner_authorized_ceiling_eur:50,
 source:'DEEPSEEK_OWNER_DASHBOARD',auto_recharge:false
});
export function authorizeDeepSeekBalanceDelta(payload,{projected_usd=0.01}={}){
 const result={allowed:false,reason:'BALANCE_UNVERIFIED',baseline_usd:98.23,cap_usd:40};
 if(!Number.isFinite(projected_usd)||projected_usd<0||projected_usd>5)
  return {...result,reason:'INVALID_PROJECTION'};
 if(payload?.is_available!==true||!Array.isArray(payload?.balance_infos))
  return result;
 const balances=payload.balance_infos.filter(x=>x?.currency==='USD');
 if(balances.length!==1)return {...result,reason:'USD_BALANCE_AMBIGUOUS'};
 const balance=balances[0];
 if(typeof balance.total_balance!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(balance.total_balance))
  return {...result,reason:'USD_BALANCE_INVALID'};
 const usd=Number(balance.total_balance);
 if(!Number.isFinite(usd))return {...result,reason:'USD_BALANCE_INVALID'};
 if(usd>98.23+0.01)return {...result,reason:'BALANCE_REBASE_REQUIRED'};
 const decline=Math.max(0,98.23-usd);
 if(usd+0.000001<projected_usd)return {...result,reason:'INSUFFICIENT_BALANCE'};
 if(decline+projected_usd>40)return {...result,reason:'JARVIS_MONEY_LIMIT'};
 return {allowed:true,reason:'ALLOW_LAB_ONLY',balance_usd:usd,
  decline_since_baseline_usd:+decline.toFixed(4),
  projected_usd,baseline_usd:98.23,cap_usd:40,
  authoritative_global_provider_limit:false};
}
