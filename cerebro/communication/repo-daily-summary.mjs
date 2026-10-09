import fs from 'node:fs';
import path from 'node:path';

function read(file,fallback){return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function uniq(values){return [...new Set(values.filter(Boolean))];}
function text(value){return String(value??'').trim();}
function matches(value,words){const x=text(value).toLowerCase();return words.some(w=>x.includes(w));}
function listValues(value){return Object.values(value??{});}
function humanName(item={}){return text(item.human_alias)||text(item.name)||text(item.candidate_id)||'Habilidad sin nombre';}

const SKILL_PURPOSE=Object.freeze({
  'obsidian':'Sirve para organizar, relacionar y reutilizar mejor el conocimiento que CEREBRO necesita recordar.',
  'github':'Sirve para que CEREBRO pueda revisar y trabajar con el código: cambios, versiones, pruebas, incidencias y despliegues.',
  'agent-browser':'Sirve para que CEREBRO pueda navegar por páginas web, comprobar resultados y realizar tareas de navegador de forma controlada.',
  'supabase-postgres-best-practices':'Sirve para que CEREBRO trabaje mejor y con más seguridad sobre bases de datos Supabase/PostgreSQL.',
  'skill-creator':'Sirve para que CEREBRO pueda fabricar nuevas habilidades bien estructuradas, documentadas y probadas.',
  'kairos-lite':'Sirve para mejorar cómo CEREBRO planifica, construye, prueba y mantiene software.',
  'reddit-content-ops':'Sirve para investigar y operar contenido en Reddit cuando exista un caso de uso real, permitido y seguro.',
  'ai-behavior-trees-utility-ai':'Sirve para mejorar cómo CEREBRO organiza decisiones y comportamientos de agentes mediante reglas, prioridades y puntuación.'
});

const DOMAIN_PURPOSE=Object.freeze({
  'software-engineering-devops':'Sirve para mejorar cómo CEREBRO construye, prueba, despliega y mantiene software.',
  'agent-ai-orchestration':'Sirve para mejorar cómo CEREBRO coordina tareas, agentes, decisiones y herramientas.',
  'browser-automation-scraping':'Sirve para mejorar tareas de navegación, comprobación y extracción de información en webs.',
  'data-database':'Sirve para mejorar el trabajo con datos, bases de datos, consultas y seguridad.',
  'knowledge-memory':'Sirve para mejorar memoria, conocimiento y recuperación de información.',
  'seo-marketing':'Sirve para mejorar investigación, SEO, contenidos y captación.'
});

const ENGINE_IMPACT=Object.freeze({
  'ORCH-001':'coordinación de trabajos',
  'ROUTE-001':'elección de herramientas y rutas',
  'FACT-001':'Fábrica de Motores y Skills',
  'RAG-001':'búsqueda y recuperación de conocimiento',
  'LRN-001':'aprendizaje continuo',
  'ACTGW-001':'ejecución controlada de acciones',
  'ARCH-001':'arquitectura técnica',
  'API-001':'APIs e integraciones',
  'DEP-001':'despliegues',
  'MIG-001':'migraciones',
  'QA-001':'pruebas y calidad',
  'REG-001':'registros y gobierno',
  'DOCS-001':'documentación'
});

function skillPurpose(item={}){
  const name=text(item.name).toLowerCase();
  if(SKILL_PURPOSE[name]) return SKILL_PURPOSE[name];
  const domain=text(item.domain).toLowerCase();
  if(DOMAIN_PURPOSE[domain]) return DOMAIN_PURPOSE[domain];
  return 'Es una habilidad que CEREBRO está evaluando para comprobar si aporta una mejora real antes de integrarla.';
}

function skillImpact(item={}){
  const bindings=Array.isArray(item.engine_bindings)?item.engine_bindings:[];
  const labels=uniq(bindings.map(x=>ENGINE_IMPACT[x]).filter(Boolean));
  if(labels.length) return labels.slice(0,4).join(', ')+'.';
  const name=text(item.name).toLowerCase();
  if(name==='obsidian') return 'memoria, conocimiento y aprendizaje.';
  if(name==='github'||name==='kairos-lite') return 'programación, App, automatizaciones y mantenimiento técnico.';
  if(name==='agent-browser') return 'web, SEO, WordPress, comprobaciones y automatizaciones de navegador.';
  if(name==='supabase-postgres-best-practices') return 'App, CRM, datos, permisos y rendimiento.';
  if(name==='skill-creator') return 'todo CEREBRO, porque permite crear nuevas habilidades reutilizables.';
  return 'las áreas que superen las pruebas OLD vs NEW sin empeorar seguridad, coste o calidad.';
}

function simpleState(kind,item={}){
  if(kind==='IN_FLIGHT') return 'TRABAJANDO AHORA';
  if(kind==='WAITING_SAFE') return 'EN PRUEBAS · SIGUIENTE PASO SEGURO PENDIENTE';
  if(kind==='WAITING_HUMAN') return 'PARADA · NECESITA TU DECISIÓN';
  if(kind==='HOLD') return 'APARCADA · NO SE INTEGRA DE MOMENTO';
  if(kind==='COMPLETED'){
    if(item?.canary?.status==='GREEN_AUTONOMOUS_PROD_READONLY_CANARY') return 'VALIDADA EN MODO LECTURA · SIN ESCRIBIR EN PROD';
    return 'PRUEBAS TERMINADAS EN EL ALCANCE SEGURO';
  }
  return 'EN REVISIÓN';
}

function achieved(kind,item={}){
  if(kind==='IN_FLIGHT') return 'CEREBRO ya la ha seleccionado y está ejecutando su ciclo de evaluación.';
  if(kind==='WAITING_SAFE') return 'La parte ya probada se mantiene segura; CEREBRO ha detenido el avance hasta el siguiente paso permitido.';
  if(kind==='WAITING_HUMAN') return 'CEREBRO ha llegado al límite exacto que exige intervención humana y no lo ha sobrepasado.';
  if(kind==='HOLD') return 'La habilidad ya fue analizada y quedó aislada; no ejecuta código externo, no toca clientes y no escribe en PROD.';
  if(kind==='COMPLETED'){
    if(item?.canary?.status==='GREEN_AUTONOMOUS_PROD_READONLY_CANARY') return 'Ha superado el circuito seguro y puede observar en modo solo lectura dentro del alcance autorizado.';
    return 'Ha completado las pruebas previstas para su alcance actual.';
  }
  return 'Se ha registrado y está siendo evaluada.';
}

function missing(kind,item={}){
  if(kind==='IN_FLIGHT') return 'Terminar pruebas, comparación OLD vs NEW y evaluación antes de conservar cualquier mejora.';
  if(kind==='WAITING_SAFE') return 'Ejecutar el siguiente bloque seguro y volver a medir el resultado.';
  if(kind==='WAITING_HUMAN') return `Tu decisión es necesaria por ${text(item.human_required)||'una excepción humana real'}.`;
  if(kind==='HOLD') return 'Nada urgente. Solo se retomará si aparece un caso de uso claro o nueva evidencia que justifique seguir.';
  if(kind==='COMPLETED') return 'No hay nada urgente. Cualquier ampliación futura de permisos volverá a pasar por sus gates.';
  return 'Completar la evaluación.';
}

function nextStep(kind,item={}){
  if(kind==='IN_FLIGHT') return 'CEREBRO seguirá probándola automáticamente dentro de LAB/PREPROD.';
  if(kind==='WAITING_SAFE') return 'CEREBRO continuará con el siguiente paso seguro disponible.';
  if(kind==='WAITING_HUMAN') return 'Esperar tu decisión exacta; el resto del trabajo seguro puede continuar en paralelo.';
  if(kind==='HOLD') return 'Queda apartada mientras CEREBRO continúa con otras habilidades útiles.';
  if(kind==='COMPLETED') return 'Mantenerla dentro de su alcance validado y observar resultados; no ampliar permisos por defecto.';
  return 'Continuar la evaluación segura.';
}

function ownerAction(kind,item={}){
  if(kind==='WAITING_HUMAN') return `SÍ. CEREBRO te enviará la autorización concreta por ${text(item.human_required)||'HUMAN_REQUIRED'}.`;
  return 'NO. CEREBRO continúa solo dentro de los límites seguros.';
}

export function buildHumanSkillCard(item={},kind='IN_REVIEW'){
  return `${humanName(item)}\n  Qué es realmente: ${skillPurpose(item)}\n  Estado: ${simpleState(kind,item)}\n  Qué se ha conseguido: ${achieved(kind,item)}\n  Qué falta: ${missing(kind,item)}\n  Dónde puede mejorar CEREBRO: ${skillImpact(item)}\n  Siguiente paso: ${nextStep(kind,item)}\n  ¿Necesitas hacer algo?: ${ownerAction(kind,item)}`;
}

function countRelated(runs,commits,words){
  return runs.filter(r=>matches(`${r.name} ${r.path} ${r.display_title}`,words)).length+
    commits.filter(c=>matches(c?.commit?.message||c?.message,words)).length;
}

function plainAreaSummary(runs,commits,words,label){
  const count=countRelated(runs,commits,words);
  return count
    ? [`Se han registrado ${count} movimientos relacionados con ${label}. El detalle técnico queda guardado para auditoría y solo te lo mostraré si aporta valor o existe un problema.`]
    : [`Sin novedades relevantes de ${label} en la ventana revisada.`];
}

function safeNextAction(code){
  const known={
    'TERMINAL_HOLD_CONTINUE_OTHER_SAFE_WORK':'CEREBRO seguirá con otras habilidades seguras; las que están en HOLD permanecen apartadas.',
    'WAITING_SAFE_HANDLER':'CEREBRO ejecutará el siguiente bloque seguro disponible.',
    'CONTINUE_SAFE_WORK':'CEREBRO seguirá trabajando automáticamente dentro de LAB/PREPROD.'
  };
  if(known[text(code)]) return known[text(code)];
  return code
    ? 'CEREBRO seguirá con el siguiente trabajo seguro registrado. El código técnico se conserva en la auditoría, no en el cuerpo principal del correo.'
    : 'No hay un siguiente trabajo del ciclo de skills registrado en este momento.';
}

export function buildRepoDailySummary({runs=[],commits=[],skillState={},communicationState={}}={}){
  const completedRuns=runs.filter(r=>r?.status==='completed');
  const failed=completedRuns.filter(r=>!['success','skipped','neutral'].includes(r?.conclusion));
  const inFlight=listValues(skillState?.in_flight);
  const waitingHuman=listValues(skillState?.waiting_human);
  const waitingSafe=listValues(skillState?.waiting_safe_handler);
  const holds=listValues(skillState?.terminal_hold);
  const completedSkills=listValues(skillState?.completed);
  const pending=listValues(communicationState?.pending);
  const costs=[...inFlight,...waitingHuman,...waitingSafe,...holds,...completedSkills].map(x=>Number(x?.additional_cost_eur??0)).filter(Number.isFinite);
  const visibleCost=costs.reduce((a,b)=>a+b,0);
  const commitsToday=uniq(commits.map(c=>{const m=text(c?.commit?.message||c?.message).split('\n')[0];return m?`${m}`:null;})).slice(0,30);

  const skillCards=[];
  const seen=new Set();
  const add=(kind,item)=>{
    const id=text(item?.candidate_id)||text(item?.name)||JSON.stringify(item);
    if(seen.has(id)) return;
    seen.add(id);
    skillCards.push(buildHumanSkillCard(item,kind));
  };
  inFlight.forEach(x=>add('IN_FLIGHT',x));
  waitingSafe.forEach(x=>add('WAITING_SAFE',x));
  waitingHuman.forEach(x=>add('WAITING_HUMAN',x));
  holds.forEach(x=>add('HOLD',x));
  completedSkills.slice(-3).forEach(x=>add('COMPLETED',x));

  const activeCount=inFlight.length+waitingSafe.length;
  const humanSummary=[
    `Ahora mismo CEREBRO está trabajando con ${activeCount} skill${activeCount===1?'':'s'} activa${activeCount===1?'':'s'}, tiene ${holds.length} en HOLD y ${waitingHuman.length} esperando una decisión humana.`,
    failed.length?`Hay ${failed.length} proceso${failed.length===1?'':'s'} técnico${failed.length===1?'':'s'} con fallo o cancelación; CEREBRO lo mantiene visible para diagnóstico.`:'No hay fallos de workflow relevantes registrados en la ventana revisada.',
    pending.length?`Tienes ${pending.length} autorización${pending.length===1?'':'es'} pendiente${pending.length===1?'':'s'}.`:'No tienes autorizaciones pendientes.',
    `Coste adicional visible en el ciclo de skills: ${visibleCost.toFixed(2)} €.`
  ];

  const holdsHuman=[
    ...holds.map(x=>`${humanName(x)} está en HOLD: queda apartada y no actúa mientras CEREBRO sigue con otras tareas seguras.`),
    ...waitingHuman.map(x=>`${humanName(x)} necesita tu decisión por ${text(x.human_required)||'una excepción humana real'}.`),
    ...pending.map(x=>`Hay una autorización pendiente relacionada con ${text(x.human_alias)||text(x.technical_id)||'una acción de CEREBRO'}.`)
  ];

  return {
    human:humanSummary,
    published:[commitsToday.length?`Hoy se han registrado ${commitsToday.length} cambios técnicos en el repositorio principal. El detalle queda auditado y no se vuelca al correo salvo que sea necesario.`:'No se han registrado cambios nuevos en el repositorio principal durante la ventana revisada.'],
    failures:[failed.length?`Hay ${failed.length} ejecución${failed.length===1?'':'es'} técnica${failed.length===1?'':'s'} con fallo o cancelación. CEREBRO debe diagnosticarla sin ocultarla; si requiere tu intervención aparecerá expresamente como HUMAN_REQUIRED.`:'Sin fallos técnicos relevantes registrados en la ventana revisada.'],
    seo_web:plainAreaSummary(runs,commits,['seo','wordpress','web','landing','gsc','city'],'SEO y web'),
    app_crm:plainAreaSummary(runs,commits,['app','crm','supabase','session context'],'App, CRM y datos'),
    automations:plainAreaSummary(runs,commits,['automation','automat','integration','bridge','connector'],'automatizaciones e integraciones'),
    skills_engines:skillCards.length?skillCards:['No hay ninguna skill activa, en espera, en HOLD o recién terminada que necesite aparecer hoy.'],
    training_learning:plainAreaSummary(runs,commits,['training','learning','learn','rsi','meta'],'aprendizaje y entrenamiento'),
    holds_human_required:holdsHuman.length?holdsHuman:['No hay HOLDs ni decisiones humanas nuevas que requieran tu atención.'],
    cost:[`Coste adicional registrado en los elementos visibles del ciclo de skills: ${visibleCost.toFixed(2)} €.`],
    next_safe_work:[safeNextAction(skillState?.last_action)],
    missing_telemetry:['Este correo solo afirma lo que tiene evidencia. Los detalles técnicos, IDs, ramas, commits, runs y estados internos quedan guardados para auditoría y no se muestran salvo que ayuden a tomar una decisión.','Si un motor todavía no envía telemetría suficiente, CEREBRO lo considera cobertura pendiente y no inventa su estado.']
  };
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const summary=buildRepoDailySummary({runs:read(arg('--runs'),[]),commits:read(arg('--commits'),[]),skillState:read(arg('--skill-state'),{}),communicationState:read(arg('--communication-state'),{})});
  const output=arg('--output')||'artifacts/communication/daily-summary.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n','utf8');
  console.log(JSON.stringify({sections:Object.keys(summary).length}));
}
