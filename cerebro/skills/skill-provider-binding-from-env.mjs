import fs from 'node:fs';
import path from 'node:path';

const PROVIDERS=Object.freeze({
  'cloudflare-workers-ai-free': {required:['CEREBRO_CF_TOKEN_PRESENT','CEREBRO_CF_ACCOUNT_PRESENT'], policy:'CEREBRO_CF_POLICY_GREEN', quota:'CEREBRO_CF_FREE_QUOTA_GUARD'},
  'google-gemini-api-free': {required:['CEREBRO_GEMINI_KEY_PRESENT'], policy:'CEREBRO_GEMINI_POLICY_GREEN', quota:'CEREBRO_GEMINI_FREE_QUOTA_GUARD'},
  'mistral-api-free-mode': {required:['CEREBRO_MISTRAL_KEY_PRESENT'], policy:'CEREBRO_MISTRAL_POLICY_GREEN', quota:'CEREBRO_MISTRAL_FREE_QUOTA_GUARD'}
});

function flag(env,name){return String(env?.[name]??'').toLowerCase()==='true';}

export function bindProviderReadinessFromEnv(providerEvidence,{env=process.env}={}){
  if(!providerEvidence||typeof providerEvidence!=='object') throw new TypeError('providerEvidence required');
  const clone=structuredClone(providerEvidence);
  const bindings=[];
  for(const route of clone.routes??[]){
    const spec=PROVIDERS[route.provider_id];
    if(!spec) continue;
    const requiredReady=spec.required.every(name=>flag(env,name));
    const policyGreen=route.data_policy_state==='SYNTHETIC_ONLY_BY_DEFAULT'||route.data_policy_state==='NOT_APPLICABLE'||flag(env,spec.policy);
    const quotaGuarded=flag(env,spec.quota);
    const retired=route.availability_state==='RETIRED';
    route.credential_state=requiredReady&&!retired?'READY':'UNBOUND';
    route.eligible_for_behavioral_inference=Boolean(!retired&&requiredReady&&policyGreen&&quotaGuarded&&route.additional_cost_eur===0&&route.behavioral_inference===true&&route.online===true&&route.own_server_required===false);
    bindings.push({
      provider_id:route.provider_id,
      credential_ready:requiredReady&&!retired,
      policy_green:policyGreen,
      quota_guarded:quotaGuarded,
      eligible_for_behavioral_inference:route.eligible_for_behavioral_inference,
      secret_values_read:false,
      secret_values_emitted:false
    });
  }
  return Object.freeze({schema_version:'0.1.0',execution_mode:'PRESENCE_FLAGS_ONLY',provider_evidence:clone,bindings,secret_values_read:false,secret_values_emitted:false});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const input=JSON.parse(fs.readFileSync(argValue('--providers')??'cerebro/skills/zero-cost-provider-evidence.v0.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-provider-binding.json';
  const report=bindProviderReadinessFromEnv(input);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,bindings:report.bindings,secret_values_read:false,secret_values_emitted:false}));
}
