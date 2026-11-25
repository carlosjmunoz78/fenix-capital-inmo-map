import fs from 'node:fs';
import {validatePublicRequest} from './public-synthetic-guard.mjs';
const token=process.env.VERCEL_TOKEN;
const mode=process.argv[2];
const team='team_qnh6u1Ofy2WPp0MGEKlyMA50',project='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu',name='cerebro-fact001-vercel-lab-20261111';
const req=JSON.parse(fs.readFileSync(new URL('./skill-request.json',import.meta.url),'utf8'));
if(!validatePublicRequest(req)||!token){console.log('HOLD_REQUEST');process.exit(4)}
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
const api=async(path,opts={})=>fetch('https://api.vercel.com'+path+'?teamId='+team,{...opts,headers,redirect:'error',signal:AbortSignal.timeout(30000)});
try{
 const r=await api('/v9/projects/'+project);if(!r.ok){console.log('HOLD_VERCEL_PROJECT_HTTP_'+r.status);process.exit(4)}
 const p=await r.json();if(p.id!==project||p.name!==name||p.accountId!==team||p.ssoProtection?.deploymentType!=='all'||p.ssoProtection?.enabled!==true){console.log('HOLD_PROJECT_SCOPE');process.exit(4)}
 if(mode==='preflight'){console.log('PRIVATE_VERCEL_LAB_PREFLIGHT_OK');process.exit(0)}
 if(mode!=='dispatch'||process.env.CEREBRO_RESERVATION_CONFIRMED!=='true'||process.env.CEREBRO_RESERVATION_ID!==req.id){console.log('HOLD_RESERVATION');process.exit(4)}
 const code='const APPROVED_PACKET_ID='+JSON.stringify(req.id)+';\nconst APPROVED_PUBLIC_CASE='+JSON.stringify(req.case_id)+';\n'+fs.readFileSync(new URL('./skill-probe.mjs',import.meta.url),'utf8');
 const body={name,project,files:[{file:'vercel.json',encoding:'utf-8',data:JSON.stringify({framework:null,installCommand:'echo No dependencies',buildCommand:'node probe.mjs',outputDirectory:'out'})},{file:'probe.mjs',encoding:'utf-8',data:code},{file:'skill-oracle.mjs',encoding:'utf-8',data:fs.readFileSync(new URL('./skill-oracle.mjs',import.meta.url),'utf8')},{file:'public-synthetic-guard.mjs',encoding:'utf-8',data:fs.readFileSync(new URL('./public-synthetic-guard.mjs',import.meta.url),'utf8')}],meta:{cerebro:'OPENROUTER_SKILL_EVAL_LAB_V1',reservation:req.id}};
 const res=await api('/v13/deployments',{method:'POST',body:JSON.stringify(body)});
 if(!res.ok){console.log('HOLD_DEPLOYMENT_HTTP_'+res.status);process.exit(4)}
 const d=await res.json();if(!/^dpl_[a-zA-Z0-9]+$/.test(d.id??'')||d.target==='production'){console.log('HOLD_DEPLOYMENT_RECEIPT');process.exit(4)}
 console.log('SKILL_PREVIEW_SUBMITTED '+d.id);
}catch{console.log('HOLD_VERCEL_UNKNOWN_NO_RETRY');process.exit(4)}
