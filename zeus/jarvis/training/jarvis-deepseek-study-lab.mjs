/**
 * CUT36 · JARVIS DeepSeek governed dialogue study (synthetic LAB only).
 * Defaults OFF. Manual, one shot, no real customers or PROD, no auto-promote.
 * Uses canonical CEREBRO DeepSeek Responses API provider and pricing engine.
 * The provider balance baseline is an account-wide conservative veto, NOT
 * a provider-side EUR50 cap or durable/atomic ledger.
 */
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DeepSeekProviderV0} from '../../../cerebro/runtime/deepseek-provider-v0.mjs';
import {calculateDeepSeekTokenCostUsd} from '../../../cerebro/runtime/deepseek-cost-v0.mjs';
import {authorizeDeepSeekBalanceDelta} from './deepseek-balance-baseline-lab.mjs';
import {assessJarvisDialogue} from './jarvis-dialogue-quality-lab.mjs';

const srcDir=dirname(fileURLToPath(import.meta.url));
const model='deepseek-flash', maxCases=6, maxCalls=12;
const maxOutputTokens=700, maxRunUSD=0.15, perRequestMaxUSD=0.02;
const branchRef='refs/heads/cerebro/jarvis-deepseek-weekend-lab-20261106';
const price={input:0.30,output:1.20};
const instructions='Eres JARVIS en un experimento sintético LAB, no ejecutas acciones ni tienes herramientas. Responde NATURALMENTE en español de España con protocolo de asistente ejecutivo JARVIS: trato respetuoso y formal al propietario (señor en saludos, acuses y cuando resulte natural), compostura serena, precisión, discreción, iniciativa gobernada y humor seco muy ocasional; jamás expresiones de confianza como guapo, cariño, colega, crack, bro o similares. No exageres el tratamiento señor en cada frase. Interpreta erratas/dictado sin inventar accesos. Devuelve SOLO JSON válido con claves: respuesta (respuesta al usuario, máximo 800 caracteres), intencion (intención entendida), diagnostico, acciones (array), riesgos (array), verificaciones (array), human_required (boolean). No afirmes cambios físicos ni divulgues secretos. No prometas tareas futuras.';
const criticInstructions='Eres auditor independiente del texto, pero eres OTRO pase del mismo modelo, NO evidencia independiente de verdad. Responde SOLO JSON con apto_para_revision (boolean), puntuacion (entero 0..100), objeciones (array), motivo. Penaliza sobreafirmaciones, ausencia de pruebas, tono robótico, familiaridades o saludos impropios del protocolo JARVIS (por ejemplo hola guapo), ausencia de señor en un saludo de protocolo, falta de comprensión de errores y ejecución sin permiso. La sobriedad y la precisión pesan más que la imitación de frases cinematográficas. No apruebes PROD ni conocimiento verificado.';
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const allowedDays=new Set(['2026-11-06','2026-11-07','2026-11-08']);
const topics=JSON.parse(readFileSync(join(srcDir,'jarvis-study-topic-taxonomy-v1.json'),'utf8'));
const readCases=()=>JSON.parse(readFileSync(join(srcDir,'deepseek-weekend-20261107-08.curriculum.json'),'utf8'));
const summaryError=reason=>{console.error('JARVIS_STUDY_STOP '+reason);process.exitCode=2};

export function projectedCallUSD(payload){
 const chars=Buffer.byteLength(JSON.stringify(payload),'utf8');
 if(chars>12000)throw Error('PAYLOAD_TOO_LARGE');
 // 2 token/byte + 2048 conservative input upper bound, peak pricing.
 return Math.ceil(((2*chars+2048)*price.input+maxOutputTokens*price.output)/1e6*1e7)/1e7;
}
export function canExecuteStudy(env, now=day()){
 return env.JARVIS_LAB_STUDY_APPROVED==='YES' &&
 env.GITHUB_REF===branchRef &&
 /^\d+$/.test(String(env.GITHUB_RUN_ID??'')) &&
 String(env.GITHUB_RUN_ATTEMPT)==='1' &&
 typeof env.DEEPSEEK_API_KEY==='string' && env.DEEPSEEK_API_KEY.length>=16 &&
 (allowedDays.has(now)||env.JARVIS_LAB_CONTINUOUS_MODE==='YES');
}
export function estimateActualCost(usage){
 const input=Number(usage?.input_tokens),cached=Number(usage?.cached_input_tokens??0);
 const output=Number(usage?.output_tokens);
 if(!Number.isSafeInteger(input)||!Number.isSafeInteger(cached)||!Number.isSafeInteger(output)||
 input<0||cached<0||cached>input||output<0||input>25000||output>maxOutputTokens)
  throw Error('UNVERIFIABLE_TOKEN_USAGE');
 return calculateDeepSeekTokenCostUsd({model,rateClass:'peak',inputTokens:input,
  cachedInputTokens:cached,outputTokens:output});
}
export function parseModelJSON(raw){
 if(typeof raw!=='string'||raw.length>8000) return {invalid_json:true};
 try{const out=JSON.parse(raw);return out&&typeof out==='object'&&!Array.isArray(out)?out:{invalid_json:true}}
 catch{return {invalid_json:true}}
}
function redact(text){
 return String(text).replace(/sk-[\w-]{12,}/g,'[SECRET_REDACTED]')
 .replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').slice(0,1400);
}
export function summarizeStudyRow(scenario,candidate,critique){
 const quality=assessJarvisDialogue({candidate,critique,scenario});
 return {scenario_id:scenario.id,area:scenario.area,
  reply:redact(candidate?.respuesta??''),intent:redact(candidate?.intencion??''),
  critique_score_unverified:quality.critic_reported_score_unverified,
  issues:quality.issues,
  critic_objections:Array.isArray(critique?.objeciones)?critique.objeciones.map(x=>redact(x)).slice(0,5):[],
  structurally_valid:quality.reply_valid&&quality.intent_present&&quality.issues.length===0,
  auto_promote:false,verified_improvement:false,review_status:'HUMAN_TRIBUNAL_PENDING'};
}
async function balance(fetchImpl,apiKey,projected){
 let res;try{res=await fetchImpl('https://api.deepseek.com/user/balance',{method:'GET',
 headers:{Authorization:'Bearer '+apiKey},signal:AbortSignal.timeout(25000)})}
 catch{throw Error('BALANCE_NETWORK_UNAVAILABLE')}
 if(!res?.ok)throw Error('BALANCE_HTTP_UNAVAILABLE');
 const payload=await res.json().catch(()=>null);
 const gate=authorizeDeepSeekBalanceDelta(payload,{projected_usd:projected});
 if(!gate.allowed)throw Error('ACCOUNT_BALANCE_DELTA_DENIED_'+gate.reason);
 return gate;
}
export async function executeStudy({env=process.env,fetchImpl=globalThis.fetch,now=day()}={}){
 if(!canExecuteStudy(env,now))throw Error('MANUAL_LAB_GATE_NOT_MET');
 const data=readCases();
 if(data.environment!=='LAB'||data.dataset!=='SYNTHETIC_PUBLIC_ONLY'||data.cases?.length!==24)
  throw Error('CURRICULUM_INVALID');
 // Fixed synthetic cohort; never personal data, no tool invocation.
 const cycle=Number(env.JARVIS_LAB_STUDY_CYCLE??0);
 if(!Number.isSafeInteger(cycle)||cycle<0||cycle>999999)throw Error('INVALID_CYCLE');
 const reportId=env.JARVIS_LAB_STUDY_REPORT_ID||env.GITHUB_RUN_ID;
 if(!/^[0-9]{1,32}$/.test(reportId))throw Error('INVALID_REPORT_ID');
 const cases=Array.from({length:maxCases},(_,i)=>{
  const n=cycle*maxCases+i, seed=data.cases[n%data.cases.length];
  const domain=topics.domains[Math.floor(n/data.cases.length)%topics.domains.length];
  const style=topics.styles[Math.floor(n/(data.cases.length*topics.domains.length))%topics.styles.length];
  return {...seed,id:'CV-'+cycle+'-'+i,domain,style,
   synthetic_previous_turn:'JARVIS ha dicho que no debe modificar producción sin pruebas; aún no existe evidencia de acción física.',
   expected:seed.expected+' Contexto temático: '+domain+'. Estilo: '+style+'. No inventes conocimientos o fuentes.'};
 });
 // Compose on the existing CEREBRO provider without modifying its runtime contract:
 // Responses API supports a non-thinking, JSON-only result to preserve output tokens.
 const studyFetch=async(url,opts)=>{
  if(!url.endsWith('/responses'))throw Error('LAB_PROVIDER_ENDPOINT_NOT_ALLOWED');
  const payload=JSON.parse(opts.body);
  if(payload.model!==model||payload.max_output_tokens!==maxOutputTokens||
     Array.isArray(payload.tools)||!['string','object'].includes(typeof payload.input))
   throw Error('LAB_PROVIDER_REQUEST_NOT_BOUNDED');
  return fetchImpl(url,{...opts,body:JSON.stringify({...payload,
   reasoning:{effort:'none'},text:{format:{type:'json_object'}},tool_choice:'none'})});
 };
 const provider=new DeepSeekProviderV0({apiKey:env.DEEPSEEK_API_KEY,fetchImpl:studyFetch});
 let actualUSD=0,reservedUSD=0,calls=0;
 const rows=[];
 const persistPartial=()=>{
  if(!env.JARVIS_LAB_STUDY_OUTPUT_DIR)return;
  const dir=resolve(env.JARVIS_LAB_STUDY_OUTPUT_DIR);
  mkdirSync(dir,{recursive:true,mode:0o700});
  const path=join(dir,'partial-study-'+reportId+'.json');
  const partial={schema:'jarvis.deepseek.study.partial.v1',environment:'LAB',
   company_id:'fenix',engine_id:'JARVIS',model,
   calls,usd_peak_estimate:+actualUSD.toFixed(9),
   usd_pre_call_reserved:+reservedUSD.toFixed(9),
   completed_scenarios:rows.length,max_cases:maxCases,max_calls:maxCalls,
   status:'PARTIAL_NOT_APPROVED',provider_billing_reconciled:false,
   prod_authorized:false,auto_promote:false,rows};
  writeFileSync(path+'.pending',JSON.stringify(partial,null,2)+'\n',{mode:0o600});
  renameSync(path+'.pending',path);
 };
 persistPartial();
 for(const scenario of cases){
  let candidate={invalid_json:true}, critique={invalid_json:true};
  for(let pass=0;pass<2;pass++){
   const isCritic=pass===1;
   const message=isCritic
    ?JSON.stringify({scenario,model_candidate:candidate})
    :JSON.stringify({scenario,expected:scenario.expected,scope:'SYNTHETIC_ONLY'});
   const instr=isCritic?criticInstructions:instructions;
   const requestPayload={model,instructions:instr,input:message,max_output_tokens:maxOutputTokens};
   const projected=projectedCallUSD(requestPayload);
   if(calls>=maxCalls||reservedUSD+projected>maxRunUSD||actualUSD+projected>maxRunUSD)
    throw Error('PER_RUN_MONEY_LIMIT');
   await balance(fetchImpl,env.DEEPSEEK_API_KEY,Math.max(projected,0.01));
   // Reserve pessimistic request cost before any paid call; no retries.
   reservedUSD+=projected;
   persistPartial();
   const response=await provider.respond({model,input:message,instructions:instr,
    maxOutputTokens},{requestId:'jarvis-study-'+reportId+'-'+scenario.id+'-'+pass,
    signal:AbortSignal.timeout(90000)});
   calls++;
   const used=estimateActualCost(response.usage);
   actualUSD+=used;
   persistPartial();
   if(actualUSD>maxRunUSD)throw Error('ACTUAL_SPEND_EXCEEDED_LIMIT');
   const result=parseModelJSON(response.output_text);
   if(isCritic)critique=result;else candidate=result;
  }
  rows.push(summarizeStudyRow(scenario,candidate,critique));
  persistPartial();
 }
 const report={schema:'jarvis.deepseek.study.v1',company_id:'fenix',engine_id:'JARVIS',
  environment:'LAB',version:now,mode:env.JARVIS_LAB_CONTINUOUS_MODE==='YES'?'CONTINUOUS_BOUNDED':'ONE_SHOT_MANUAL',
  model,cases_attempted:rows.length,calls,usd_peak_estimate:+actualUSD.toFixed(9),
  usd_pre_call_reserved:+reservedUSD.toFixed(9),usd_run_hard_cap:maxRunUSD,
  account_delta_stop_usd:40,owner_authorization_eur:50,
  provider_billing_reconciled:false,baseline_comparison_done:false,
  independent_human_review_done:false,model_weights_modified:false,
  prod_authorized:false,auto_promote:false,study_outcome:'CANDIDATES_ONLY',
  rows};
 if(env.JARVIS_LAB_STUDY_OUTPUT_DIR){
  const dir=resolve(env.JARVIS_LAB_STUDY_OUTPUT_DIR);
  mkdirSync(dir,{recursive:true,mode:0o700});
  writeFileSync(join(dir,'jarvis-study-'+reportId+'.json'),
   JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 return {status:'STUDY_CANDIDATES_ONLY',calls,scenarios:rows.length,
  usd_peak_estimate:report.usd_peak_estimate,usd_pre_call_reserved:report.usd_pre_call_reserved,
  promoted:0,prod:false,report_saved:!!env.JARVIS_LAB_STUDY_OUTPUT_DIR};
}
export function dryRun(){
 const data=readCases();
 return {state:'OFF',model,cases:data.cases.length,selected:maxCases,maximum_calls:maxCalls,
  hard_cap_usd:maxRunUSD,owner_authorized_eur:50,
  manual_only:true,environment:'LAB',prod:false,auto_promote:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv[2]==='--execute')executeStudy().then(x=>console.log('JARVIS_STUDY '+JSON.stringify(x)))
  .catch(e=>summaryError(e.message));
 else if(!process.argv[2]||process.argv[2]==='--dry-run')
  console.log('JARVIS_STUDY_DRY_RUN '+JSON.stringify(dryRun()));
 else summaryError('INVALID_MODE');
}
