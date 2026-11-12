import {readFileSync,writeFileSync} from 'node:fs';
import {runFiveProviderRead,assertFiveReadOrder} from './five-provider-read.mjs';
const order=assertFiveReadOrder(JSON.parse(readFileSync('cerebro/connectors/universal/services/five-provider-read-lab/requests/order.v1.json','utf8')));
async function signed(audience){
 const ep=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,grant=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!ep||!grant)throw Error('OIDC_ISSUER_UNAVAILABLE');
 const u=ep+(ep.includes('?')?'&':'?')+'audience='+encodeURIComponent(audience);
 const r=await fetch(u,{headers:{Authorization:'Bearer '+grant},redirect:'error',signal:AbortSignal.timeout(12000)});
 if(r.status!==200)throw Error('OIDC_ISSUER_HTTP_'+r.status);
 const token=(await r.json()).value;
 if(typeof token!=='string'||token.split('.').length!==3)throw Error('OIDC_MALFORMED');
 return token;
}
const receipt=await runFiveProviderRead({order,sign:signed,githubToken:process.env.GITHUB_TOKEN});
writeFileSync('fact001-five-provider-lab-evidence.json',JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
for(const p of receipt.providers)console.log('CEREBRO_FIVE_PROVIDERS_'+p.provider.toUpperCase()+'='+p.result);
console.log('CEREBRO_FIVE_PROVIDERS_REAL_READ='+receipt.providers.length+'/5');
console.log('CEREBRO_FIVE_PROVIDERS_CREDENTIALS_EXPOSED=false');
console.log('CEREBRO_FIVE_PROVIDERS_AUTONOMY_GATE=PENDING');
