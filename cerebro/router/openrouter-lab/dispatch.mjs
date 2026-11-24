import fs from 'node:fs';
const token=process.env.VERCEL_TOKEN;
const mode=process.argv[2];
const team='team_qnh6u1Ofy2WPp0MGEKlyMA50',project='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu',name='cerebro-fact001-vercel-lab-20261111';
if(!token){console.log('HOLD_VERCEL_TOKEN_ABSENT');process.exit(4)}
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
const api=async(path,opts={})=>fetch('https://api.vercel.com'+path+'?teamId='+team,{...opts,headers,redirect:'error',signal:AbortSignal.timeout(30000)});
try{
 if(mode==='preflight'){
  const r=await api('/v9/projects/'+project);if(!r.ok){console.log('HOLD_VERCEL_PROJECT_HTTP_'+r.status);process.exit(4)}
  const p=await r.json();const gates={id:p.id===project,name:p.name===name,account:p.accountId===team,sso_all:p.ssoProtection?.deploymentType==='all'&&p.ssoProtection?.enabled!==false};console.log('PROJECT_SCOPE_GATES '+JSON.stringify(gates));console.log('GITHUB_OPENROUTER_SECRET_PRESENT='+Boolean(process.env.OPENROUTER_API_KEY));if(!Object.values(gates).every(Boolean)){console.log('HOLD_PROJECT_SCOPE');process.exit(4)}
  console.log('VERCEL_PRIVATE_LAB_PREFLIGHT_OK');process.exit(0);
 }
 if(mode!=='dispatch'||process.env.CEREBRO_RESERVATION_CONFIRMED!=='true'){console.log('HOLD_RESERVATION');process.exit(4)}
 const body={name,project,files:[{file:'vercel.json',encoding:'utf-8',data:JSON.stringify({framework:null,installCommand:'echo No dependencies',buildCommand:'node probe.mjs',outputDirectory:'out'})},{file:'probe.mjs',encoding:'utf-8',data:fs.readFileSync(new URL('./probe.mjs',import.meta.url),'utf8')}],meta:{cerebro:'OPENROUTER_QUOTA_LAB_V1',cost_policy:'FIXED_PUBLIC_ONE_SHOT_NO_RETRY'}};
 const r=await api('/v13/deployments',{method:'POST',body:JSON.stringify(body)});
 if(!r.ok){console.log('HOLD_DEPLOYMENT_HTTP_'+r.status);process.exit(4)}
 const d=await r.json();if(!/^dpl_[a-zA-Z0-9]+$/.test(d.id??'')||d.target==='production'){console.log('HOLD_DEPLOYMENT_RECEIPT');process.exit(4)}
 console.log('VERCEL_PREVIEW_SUBMITTED '+d.id);
 // Deployment is only a one-shot smoke test, not autonomous runtime. No repeat on error.
}catch{console.log('HOLD_VERCEL_UNKNOWN_NO_RETRY');process.exit(4)}
