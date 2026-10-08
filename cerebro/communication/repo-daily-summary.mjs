import fs from 'node:fs';
import path from 'node:path';

function read(file,fallback){return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function uniq(values){return [...new Set(values.filter(Boolean))];}
function text(value){return String(value??'').trim();}
function runLine(r){return `${r.name||'Workflow'}: ${r.conclusion||r.status||'unknown'} (run ${r.id??'?'})`;}
function commitLine(c){const m=text(c?.commit?.message||c?.message).split('\n')[0];return m?`${m} · ${String(c.sha||'').slice(0,8)}`:null;}
function matches(value,words){const x=text(value).toLowerCase();return words.some(w=>x.includes(w));}

export function buildRepoDailySummary({runs=[],commits=[],skillState={},communicationState={}}={}){
  const completed=runs.filter(r=>r?.status==='completed');
  const failed=completed.filter(r=>!['success','skipped','neutral'].includes(r?.conclusion));
  const success=completed.filter(r=>r?.conclusion==='success');
  const bucket=(words)=>uniq([
    ...runs.filter(r=>matches(`${r.name} ${r.path} ${r.display_title}`,words)).map(runLine),
    ...commits.filter(c=>matches(c?.commit?.message||c?.message,words)).map(commitLine)
  ]).slice(0,20);
  const waitingHuman=Object.values(skillState?.waiting_human??{});
  const waitingSafe=Object.values(skillState?.waiting_safe_handler??{});
  const holds=Object.values(skillState?.terminal_hold??{});
  const completedSkills=Object.values(skillState?.completed??{});
  const pending=Object.values(communicationState?.pending??{});
  const costs=[...waitingHuman,...waitingSafe,...holds,...completedSkills].map(x=>Number(x?.additional_cost_eur??0)).filter(Number.isFinite);
  const visibleCost=costs.reduce((a,b)=>a+b,0);
  const commitsToday=uniq(commits.map(commitLine)).slice(0,30);
  const summary={
    human:[`${success.length} workflows verdes; ${failed.length} workflows con fallo o cancelación.`,`${commitsToday.length} cambios registrados en main.`,`${pending.length} autorizaciones pendientes.`],
    published:commitsToday.length?commitsToday:['Sin cambios de main registrados en la ventana.'],
    failures:failed.length?failed.map(runLine):['Sin fallos de workflow registrados en la ventana.'],
    seo_web:bucket(['seo','wordpress','web','landing','gsc','city']),
    app_crm:bucket(['app','crm','supabase','session context']),
    automations:bucket(['automation','automat','integration','bridge','connector']),
    skills_engines:uniq([...bucket(['skill','engine','factory','cerebro']),...completedSkills.slice(-10).map(x=>`${x.human_alias||x.name||x.candidate_id}: ${x.status||x.stage}`),...waitingSafe.map(x=>`${x.human_alias||x.name||x.candidate_id}: siguiente bloque seguro pendiente`)]).slice(0,30),
    training_learning:bucket(['training','learning','learn','rsi','meta']),
    holds_human_required:uniq([...holds.map(x=>`${x.human_alias||x.name||x.candidate_id}: HOLD`),...waitingHuman.map(x=>`${x.human_alias||x.name||x.candidate_id}: HUMAN_REQUIRED ${x.human_required||''}`),...pending.map(x=>`${x.human_alias||x.technical_id}: ${x.approval_id} pendiente`)]),
    cost:[`Coste adicional registrado en los elementos visibles del Skill AutoLoop: ${visibleCost.toFixed(2)} €.`],
    next_safe_work:[skillState?.last_action?`Skill AutoLoop: ${skillState.last_action}`:'Sin siguiente acción del Skill AutoLoop registrada.'],
    missing_telemetry:['Cobertura actual del resumen: GitHub Actions, commits, Skill AutoLoop y autorizaciones.','Los motores externos que todavía no publiquen eventos canónicos se indicarán como cobertura pendiente; CEREBRO no inventará estados.']
  };
  for(const key of ['seo_web','app_crm','automations','skills_engines','training_learning','holds_human_required']) if(!summary[key].length) summary[key]=['Sin novedades registradas en esta sección.'];
  return summary;
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const summary=buildRepoDailySummary({runs:read(arg('--runs'),[]),commits:read(arg('--commits'),[]),skillState:read(arg('--skill-state'),{}),communicationState:read(arg('--communication-state'),{})});
  const output=arg('--output')||'artifacts/communication/daily-summary.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n','utf8');
  console.log(JSON.stringify({sections:Object.keys(summary).length}));
}
