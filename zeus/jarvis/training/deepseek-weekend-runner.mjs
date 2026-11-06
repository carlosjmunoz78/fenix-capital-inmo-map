#!/usr/bin/env node
/* JARVIS weekend DeepSeek LAB; safe by default. No App/CRM/D1/PROD mutations.
 * This is a finite EVALUATION of synthetic cases, NOT model weight training.
 * Node >=20, no dependencies. --dry-run never uses network or credentials.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {openLifetimeBudget,reserveLifetimeBudget,closeLifetimeBudget,JARVIS_DEEPSEEK_BUDGET} from './deepseek-lifetime-budget.mjs';
import {assessJarvisDialogue} from './jarvis-dialogue-quality-lab.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const endpoint='https://api.deepseek.com';
const curriculumPath=join(root,'deepseek-weekend-20261107-08.curriculum.json');
const maxCalls=24, maxCases=12, outputLimit=800;
const hardCapUSD=JARVIS_DEEPSEEK_BUDGET.per_run_cap_usd; // Daily subcap <= 5 USD; cumulative runtime reserve <= 40 USD, owner ceiling 50 EUR.
const peakInputPricePerM=0.30,peakOutputPricePerM=1.20;
const model='deepseek-flash';
const dates=new Set(['2026-11-07','2026-11-08']);
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const readCurriculum=()=>JSON.parse(readFileSync(curriculumPath,'utf8'));
const jsonText=x=>JSON.stringify(x);
export function reservedUSD(text,maxOutput=outputLimit){
  const bytes=Buffer.byteLength(text,'utf8');
  const upperInputTokens=2*bytes+2048; // cautious upper estimate, NOT authoritative billing
  return ((upperInputTokens*peakInputPricePerM)+(maxOutput*peakOutputPricePerM))/1e6;
}
export function evaluate(c,critique){
 const a=c&&typeof c==='object'&&!Array.isArray(c)?c:{};
 const b=critique&&typeof critique==='object'&&!Array.isArray(critique)?critique:{};
 const candidateOk=typeof a.diagnostico==='string'&&typeof a.respuesta==='string'&&a.respuesta.trim().length>0&&a.respuesta.length<=900&&typeof a.intencion==='string'&&Array.isArray(a.acciones)&&Array.isArray(a.riesgos)
  &&Array.isArray(a.verificaciones)&&typeof a.human_required==='boolean';
 const criticOk=typeof b.apto_para_revision==='boolean'&&Array.isArray(b.objeciones)
  &&typeof b.motivo==='string';
 return {candidate_ok:candidateOk,critic_ok:criticOk,
  decision:'CANDIDATE_ONLY_HUMAN_TRIBUNAL_PENDING',
  needs_sources_and_tests:true,auto_promote:false};
}
const safeError=(reason)=>{console.error('JARVIS_WEEKEND_STOP: '+reason);process.exitCode=2};
const request=async(path,method,apiKey,body)=>{
 const options={method,headers:{Authorization:'Bearer '+apiKey,Accept:'application/json'},
  signal:AbortSignal.timeout(90000)};
 if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 let response;
 try{response=await fetch(endpoint+path,options)}catch{return {error:'NETWORK_OR_TIMEOUT'}}
 if(!response.ok)return {error:'HTTP_'+response.status}; // Never log provider response body.
 try{return {value:await response.json()}}catch{return {error:'INVALID_JSON'}}
};
export function balanceAvailable(data){
 if(data?.is_available!==true||!Array.isArray(data.balance_infos))return false;
 return data.balance_infos.some(x=>(x.currency==='USD'&&Number(x.total_balance)>=hardCapUSD)
  ||(x.currency==='CNY'&&Number(x.total_balance)>=hardCapUSD*10));
}
const prompt='Devuelve SOLO JSON válido en español, con campos respuesta:string (tu contestación natural y directa al usuario, máximo 900 caracteres), intencion:string (interpretación de su solicitud), diagnostico:string, acciones:array, riesgos:array, verificaciones:array y human_required:boolean. Responde como JARVIS, con empatía, concisión, comprensión de dictado imperfecto y continuidad. No inventes ejecuciones ni fuentes; no reveles secretos ni autorices PROD. Este es un ejercicio sintético LAB sin herramientas reales.';
const criticPrompt='Devuelve SOLO JSON con campos apto_para_revision:boolean, puntuacion:entero de 0 a 100, objeciones:array, motivo:string. Evalúa la respuesta candidata por naturalidad del español, comprensión de erratas, claridad, concisión, continuidad, obediencia a límites y seguridad; cuestiona toda sobreafirmación. Una puntuación de modelo NO equivale a prueba independiente ni autorización de promoción.';
async function main(){
 const mode=process.argv[2]||'--dry-run';
 const curriculum=readCurriculum();
 if(curriculum.environment!=='LAB'||curriculum.dataset!=='SYNTHETIC_PUBLIC_ONLY'||!Array.isArray(curriculum.cases))
  return safeError('INVALID_CURRICULUM');
 if(!['--dry-run','--execute'].includes(mode))return safeError('BAD_MODE');
 if(mode==='--dry-run'){
  console.log('JARVIS_WEEKEND_DRY_RUN_PASS '+jsonText({model,number_of_cases:curriculum.cases.length,
   max_cases:maxCases,max_calls:maxCalls,run_cap_usd:hardCapUSD,authorized_total_eur:50,
   conservative_lifetime_usd_cap:40,weekend_dates:[...dates],
   mode:'OFF_UNTIL_AUTHORIZED',production:false,auto_promote:false}));
  return;
 }
 if(!dates.has(today()))return safeError('NOT_SCHEDULED_WEEKEND');
 if(process.env.JARVIS_WEEKEND_ENABLE!=='1')return safeError('EXPLICIT_ENABLE_MISSING');
 const apiKey=process.env.DEEPSEEK_API_KEY;
 if(!apiKey||apiKey.length<16)return safeError('DEEPSEEK_API_KEY_MISSING');
 const balance=await request('/user/balance','GET',apiKey);
 if(balance.error||!balanceAvailable(balance.value))return safeError('BALANCE_UNVERIFIED_OR_INSUFFICIENT');
 if(!process.env.JARVIS_WEEKEND_OUTPUT_DIR)return safeError('PERSISTENT_LEDGER_DIR_REQUIRED');
 const outDir=resolve(process.env.JARVIS_WEEKEND_OUTPUT_DIR);
 mkdirSync(outDir,{recursive:true,mode:0o700});
 // One start per calendar day, atomically: no paid duplicate on reboot/retry.
 // Keep this private directory persistent across runs. Do not share the same API key
 // with another autonomous consumer unless account-wide billing is capped there.
 try{writeFileSync(join(outDir,'started-'+today()+'.lock'),'CUT34_WEEKEND_SINGLE_RUN\n',
  {flag:'wx',mode:0o600})}catch{return safeError('DAY_ALREADY_STARTED_OR_LOCK_UNAVAILABLE')}
 let lifetimeBudget;
 try{lifetimeBudget=openLifetimeBudget(outDir)}catch{return safeError('CUMULATIVE_BUDGET_LOCK_OR_LEDGER_INVALID')}
 process.once('exit',()=>{try{closeLifetimeBudget(lifetimeBudget)}catch{}});
 let charged=0,calls=0;
 const rows=[], runDate=today();
 const persist=()=>writeFileSync(join(outDir,'candidates-'+runDate+'.json'),JSON.stringify({
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',
  model,version:runDate,spent_estimate_usd:charged,calls,
  state:'CANDIDATES_ONLY_NOT_VERIFIED',items:rows},null,2)+'\n',{mode:0o600});
 const selectedCases=today().endsWith('-07')
  ?curriculum.cases.slice(0,maxCases)
  :curriculum.cases.slice(maxCases,2*maxCases);
 for(const scenario of selectedCases){
  const input=jsonText({synthetic_case:scenario,policy:'Do not execute; no customer data; no PROD'});
  const messages=[{role:'system',content:prompt},{role:'user',content:input}];
  const payload={model,messages,reasoning_effort:'none',max_tokens:outputLimit,
   response_format:{type:'json_object'},stream:false};
  const reserve=reservedUSD(jsonText(payload));
  if(calls+2>maxCalls||charged+reserve*2>hardCapUSD){persist();return safeError('PRECALL_BUDGET_CAP')}
  try{reserveLifetimeBudget(lifetimeBudget,Math.max(0.10,reserve*2))}
  catch{persist();return safeError('CUMULATIVE_BUDGET_STOP_BEFORE_FIRST_CALL')}
  const first=await request('/chat/completions','POST',apiKey,payload);
  if(first.error){persist();return safeError(first.error)}
  calls++;
  let completion=first.value?.choices?.[0]?.message?.content;
  let cost=actualCost(first.value?.usage);
  if(cost===null){persist();return safeError('MISSING_USAGE_STOP')}
  charged+=cost;
  let candidate;
  try{candidate=JSON.parse(completion)}catch{candidate={invalid_json:true}}
  rows.push({scenario_id:scenario.id,candidate,critique:null,evaluation:null,review_status:'UNVERIFIED'});
  persist();
  const criticPayload={model,messages:[{role:'system',content:criticPrompt},
   {role:'user',content:jsonText({scenario,candidate})}],reasoning_effort:'none',
   max_tokens:outputLimit,response_format:{type:'json_object'},stream:false};
  if(charged+reservedUSD(jsonText(criticPayload))>hardCapUSD)return safeError('PRECRITIC_BUDGET_CAP');
  try{reserveLifetimeBudget(lifetimeBudget,Math.max(0.10,reservedUSD(jsonText(criticPayload))*2))}
  catch{persist();return safeError('CUMULATIVE_BUDGET_STOP_BEFORE_CRITIC_CALL')}
  const second=await request('/chat/completions','POST',apiKey,criticPayload);
  if(second.error)return safeError(second.error);
  calls++;
  cost=actualCost(second.value?.usage);
  if(cost===null){persist();return safeError('MISSING_USAGE_STOP')}
  charged+=cost;
  try{rows.at(-1).critique=JSON.parse(second.value?.choices?.[0]?.message?.content)}catch{
   rows.at(-1).critique={invalid_json:true}}
  rows.at(-1).evaluation=evaluate(rows.at(-1).candidate,rows.at(-1).critique);
  rows.at(-1).dialogue_quality=assessJarvisDialogue({candidate:rows.at(-1).candidate,critique:rows.at(-1).critique,scenario});
  persist();
  if(charged>=hardCapUSD)return safeError('COST_CAP_REACHED');
 }
 console.log('JARVIS_WEEKEND_LAB_CANDIDATES_WRITTEN '+jsonText({
  cases:rows.length,calls,spent_estimate_usd:+charged.toFixed(6),
  state:'CANDIDATE_ONLY',promoted:0,report_file:join(outDir,'candidates-'+runDate+'.json')}));
}
function actualCost(u){
 if(!u||!Number.isFinite(u.prompt_tokens)||!Number.isFinite(u.completion_tokens))return null;
 if(u.prompt_tokens<0||u.completion_tokens<0)return null;
 // Worst peak price, treating all input as cache misses.
 return (u.prompt_tokens*peakInputPricePerM+u.completion_tokens*peakOutputPricePerM)/1e6;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(()=>safeError('UNEXPECTED_FAILURE'));
