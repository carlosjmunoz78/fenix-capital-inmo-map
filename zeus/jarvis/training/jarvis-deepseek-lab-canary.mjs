/** One-shot CEREBRO canonical DeepSeek provider test, LAB only.
 * Uses no customer data, no CEREBRO writes, no model promotion.
 * API key is read server-side from an isolated GitHub Environment secret.
 */
import {DeepSeekProviderV0} from '../../../cerebro/runtime/deepseek-provider-v0.mjs';
import {calculateDeepSeekTokenCostUsd} from '../../../cerebro/runtime/deepseek-cost-v0.mjs';
import {authorizeDeepSeekBalanceDelta} from './deepseek-balance-baseline-lab.mjs';

const base='https://api.deepseek.com';
export function validateJarvisSmokeContext(env){
 return env.JARVIS_LAB_SMOKE_APPROVED==='YES' &&
 env.GITHUB_REF==='refs/heads/cerebro/jarvis-deepseek-weekend-lab-20261106' &&
 typeof env.DEEPSEEK_API_KEY==='string' && env.DEEPSEEK_API_KEY.length>=16;
}
export function calculateJarvisSmokeCost(usage){
 const inp=Number(usage?.input_tokens),out=Number(usage?.output_tokens),cache=Number(usage?.cached_input_tokens??0);
 if(!Number.isSafeInteger(inp)||!Number.isSafeInteger(out)||!Number.isSafeInteger(cache)||
    inp<0||out<0||cache>inp||inp>3000||out>32)throw Error('SMOKE_USAGE_OUT_OF_BOUNDS');
 return calculateDeepSeekTokenCostUsd({model:'deepseek-flash',rateClass:'peak',
  inputTokens:inp,cachedInputTokens:cache,outputTokens:out});
}
export async function executeJarvisSmoke({env=process.env,fetchImpl=globalThis.fetch}={}){
 if(!validateJarvisSmokeContext(env))throw Error('LAB_CANARY_NOT_AUTHORIZED');
 const response=await fetchImpl(base+'/user/balance',{method:'GET',
  headers:{Authorization:'Bearer '+env.DEEPSEEK_API_KEY},signal:AbortSignal.timeout(25000)});
 if(!response?.ok)throw Error('LAB_CANARY_BALANCE_UNAVAILABLE');
 const balance=await response.json();
 const gate=authorizeDeepSeekBalanceDelta(balance,{projected_usd:0.01});
 if(!gate.allowed)throw Error('LAB_CANARY_MONEY_LIMIT_OR_BASELINE_UNVERIFIED');
 const provider=new DeepSeekProviderV0({apiKey:env.DEEPSEEK_API_KEY,fetchImpl});
 const result=await provider.respond({model:'deepseek-flash',
  instructions:'CEREBRO OS LAB synthetic canary. No tools, secrets, personal data or production actions. Return precisely the specified marker.',
  input:'Devuelve exactamente: JARVIS_LAB_CANARY_OK',maxOutputTokens:32},
  {requestId:'jarvis-lab-one-shot-smoke'});
 const cost=calculateJarvisSmokeCost(result.usage);
 if(cost>0.01)throw Error('LAB_CANARY_ACTUAL_COST_OUT_OF_BOUNDS');
 if(result.output_text.trim()!=='JARVIS_LAB_CANARY_OK')throw Error('LAB_CANARY_RESPONSE_MISMATCH');
 return {status:'CANARY_PASS',environment:'LAB',model:result.model,
  cost_usd_conservative_peak:cost,provider_limit_eur_verified:false,prod_authorized:false};
}
if(process.argv[1]?.endsWith('jarvis-deepseek-lab-canary.mjs')){
 executeJarvisSmoke().then(result=>{console.log('JARVIS_LAB_CANARY '+JSON.stringify(result))})
  .catch(error=>{console.error('JARVIS_LAB_CANARY_STOP '+error.message);process.exitCode=1});
}
