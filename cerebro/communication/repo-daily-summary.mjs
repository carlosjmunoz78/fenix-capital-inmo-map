import fs from 'node:fs';
import path from 'node:path';

function read(file,fallback){return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}
function uniq(values){return [...new Set(values.filter(Boolean))];}
function text(value){return String(value??'').trim();}
function matches(value,words){const x=text(value).toLowerCase();return words.some(w=>x.includes(w));}
function listValues(value){return Object.values(value??{});}
function humanName(item={}){return text(item.human_alias)||text(item.name)||text(item.candidate_id)||'Habilidad sin nombre';}
function stableSkillId(item={}){return text(item.candidate_id)||text(item.wrapper_id)||text(item.name)||humanName(item);}

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

const SKILL_WHY=Object.freeze({
  'obsidian':'porque puede reducir pérdida de contexto y hacer que el conocimiento útil se reutilice entre trabajos.',
  'github':'porque el software de CEREBRO necesita poder revisarse, probarse y mantenerse con evidencia y rollback.',
  'agent-browser':'porque muchas comprobaciones reales solo se pueden cerrar viendo y usando una web como lo haría una persona.',
  'supabase-postgres-best-practices':'porque App y CRM dependen de datos correctos, permisos seguros y consultas que no degraden el sistema.',
  'skill-creator':'porque permite ampliar capacidades de forma estándar sin fabricar integraciones improvisadas cada vez.',
  'kairos-lite':'porque puede mejorar la calidad y continuidad del trabajo de ingeniería si supera a lo que ya existe.',
  'reddit-content-ops':'porque puede aportar investigación de comunidad cuando exista un objetivo empresarial concreto.',
  'ai-behavior-trees-utility-ai':'porque puede hacer más deterministas y auditables ciertas decisiones de agentes.'
});

const SKILL_EXAMPLE=Object.freeze({
  'obsidian':'Ejemplo en Fénix: recuperar una decisión anterior y relacionarla con el motor que debe aplicarla sin volver a preguntarte lo mismo.',
  'github':'Ejemplo en Fénix: detectar qué cambio rompió una prueba, corregirlo en una rama segura y verificarlo antes de promoverlo.',
  'agent-browser':'Ejemplo en Fénix: abrir una landing de STAGING, rellenar el formulario y comprobar que el lead llega donde corresponde.',
  'supabase-postgres-best-practices':'Ejemplo en Fénix: revisar una consulta del CRM y evitar que una mejora de velocidad abra permisos indebidos.',
  'skill-creator':'Ejemplo en Fénix: crear una nueva habilidad de Search Console con contrato, permisos, pruebas y rollback estándar.',
  'kairos-lite':'Ejemplo en Fénix: ayudar a planificar una reparación técnica y contrastar el resultado con las pruebas existentes.',
  'reddit-content-ops':'Ejemplo en Fénix: investigar dudas reales de usuarios sobre hipotecas cuando esa fuente sea pertinente y esté permitida.',
  'ai-behavior-trees-utility-ai':'Ejemplo en CEREBRO: escoger entre varias acciones seguras usando reglas y prioridades visibles en vez de una decisión opaca.'
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
  'ORCH-001':'coordinación de trabajos','ROUTE-001':'elección de herramientas y rutas','FACT-001':'Fábrica de Motores y Skills','RAG-001':'búsqueda y recuperación de conocimiento','LRN-001':'aprendizaje continuo','ACTGW-001':'ejecución controlada de acciones','ARCH-001':'arquitectura técnica','API-001':'APIs e integraciones','DEP-001':'despliegues','MIG-001':'migraciones','QA-001':'pruebas y calidad','REG-001':'registros y gobierno','DOCS-001':'documentación'
});

function skillPurpose(item={}){
  const name=text(item.name).toLowerCase();
  if(SKILL_PURPOSE[name]) return SKILL_PURPOSE[name];
  const domain=text(item.domain).toLowerCase();
  if(DOMAIN_PURPOSE[domain]) return DOMAIN_PURPOSE[domain];
  return 'Es una habilidad que CEREBRO está evaluando para comprobar si aporta una mejora real antes de integrarla.';
}

function skillWhy(item={}){
  const name=text(item.name).toLowerCase();
  if(SKILL_WHY[name]) return `La queremos ${SKILL_WHY[name]}`;
  return 'La queremos solo si demuestra una capacidad que no esté ya cubierta o una mejora medible sobre lo existente.';
}

function skillExample(item={}){
  const name=text(item.name).toLowerCase();
  return SKILL_EXAMPLE[name]||'Ejemplo: usarla en un caso real controlado y conservarla únicamente si mejora el resultado frente a la alternativa actual.';
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
  if(kind==='IN_FLIGHT') return '🟡 EN CONSTRUCCIÓN / EVALUACIÓN';
  if(kind==='WAITING_SAFE') return '🔵 EN PRUEBAS SEGURAS';
  if(kind==='WAITING_HUMAN') return '🔴 NECESITA TU DECISIÓN';
  if(kind==='HOLD') return '⏸️ APARCADA';
  if(kind==='COMPLETED'){
    if(item?.canary?.status==='GREEN_AUTONOMOUS_PROD_READONLY_CANARY') return '🟢 TERMINADA EN MODO LECTURA';
    return '🟢 TERMINADA EN EL ALCANCE PROBADO';
  }
  return 'EN REVISIÓN';
}

function achieved(kind,item={}){
  if(kind==='IN_FLIGHT') return 'CEREBRO ya la ha seleccionado y está ejecutando su ciclo de evaluación.';
  if(kind==='WAITING_SAFE') return 'La parte ya probada se mantiene segura; el siguiente bloque está acotado antes de continuar.';
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
  if(kind==='COMPLETED') return 'No hay nada urgente. Cualquier ampliación futura de permisos volverá a pasar por sus controles.';
  return 'Completar la evaluación.';
}

function nextStep(kind,item={}){
  if(kind==='IN_FLIGHT') return 'CEREBRO seguirá probándola automáticamente dentro de LAB/PREPROD.';
  if(kind==='WAITING_SAFE') return 'CEREBRO continuará con el siguiente paso seguro disponible.';
  if(kind==='WAITING_HUMAN') return 'Esperar tu decisión exacta; el resto del trabajo seguro continúa en paralelo.';
  if(kind==='HOLD') return 'Queda apartada mientras CEREBRO continúa con otras habilidades útiles.';
  if(kind==='COMPLETED') return 'Mantenerla dentro de su alcance validado y observar resultados; no ampliar permisos por defecto.';
  return 'Continuar la evaluación segura.';
}

function ownerAction(kind,item={}){
  if(kind==='WAITING_HUMAN') return `SÍ. Motivo: ${text(item.human_required)||'excepción humana real'}.`;
  return 'NO. CEREBRO continúa solo dentro de los límites seguros.';
}

function decision(kind){
  if(kind==='COMPLETED') return 'INTEGRAR / CONSERVAR DENTRO DEL ALCANCE VALIDADO';
  if(kind==='IN_FLIGHT'||kind==='WAITING_SAFE') return 'SEGUIR PROBANDO';
  if(kind==='WAITING_HUMAN') return 'ESPERAR DECISIÓN DE CARLOS';
  if(kind==='HOLD') return 'APARCAR';
  return 'SEGUIR EVALUANDO';
}

function capabilityGain(kind,item={}){
  if(kind==='COMPLETED') return `CEREBRO ya puede usar el alcance validado de ${humanName(item)} sin ampliar permisos fuera de lo probado.`;
  if(kind==='HOLD') return 'Ninguna capacidad nueva: se ha evitado añadir complejidad sin beneficio demostrado.';
  if(kind==='WAITING_HUMAN') return 'Todavía ninguna: la capacidad queda bloqueada hasta tu decisión exacta.';
  return 'Todavía no se da por ganada: primero debe demostrar mejora real y pasar las pruebas.';
}

function measuredImpact(item={}){
  const cost=Number(item?.additional_cost_eur??0);
  const time=text(item?.measured_time_saved)||text(item?.impact?.time_saved);
  const quality=text(item?.measured_quality_gain)||text(item?.impact?.quality_gain);
  const parts=[];
  if(Number.isFinite(cost)) parts.push(`coste adicional registrado ${cost.toFixed(2)} €`);
  if(time) parts.push(`tiempo: ${time}`);
  if(quality) parts.push(`calidad: ${quality}`);
  return parts.length?`${parts.join(' · ')}.`:'Aún no medido con evidencia suficiente; CEREBRO no inventa ahorro.';
}

function snapshotEntry(kind,item={}){
  return {kind,name:text(item.name),human_alias:humanName(item),status:text(item.status),stage:text(item.stage),human_required:text(item.human_required),updated_at:text(item.updated_at),canary:text(item?.canary?.status),additional_cost_eur:Number(item?.additional_cost_eur??0)};
}

function currentSnapshot(groups){
  const out={};
  for(const [kind,items] of Object.entries(groups)) for(const item of items) out[stableSkillId(item)]=snapshotEntry(kind,item);
  return out;
}

function changedSkillIds(snapshot,previous={}){
  const ids=[];
  for(const [id,value] of Object.entries(snapshot)){
    if(JSON.stringify(value)!==JSON.stringify(previous?.[id]??null)) ids.push(id);
  }
  return ids;
}

export function buildHumanSkillCard(item={},kind='IN_REVIEW',{changed=true}={}){
  return `${humanName(item)}\n  Qué es realmente: ${skillPurpose(item)}\n  Por qué la queremos: ${skillWhy(item)}\n  Ejemplo real: ${skillExample(item)}\n  Estado: ${simpleState(kind,item)}\n  Qué ha cambiado desde el último informe: ${changed?'Tiene un cambio relevante o todavía no había sido informada con este estado.':'Sin cambios relevantes desde el último informe.'}\n  Qué se ha conseguido: ${achieved(kind,item)}\n  Qué falta: ${missing(kind,item)}\n  Qué podrá hacer CEREBRO: ${capabilityGain(kind,item)}\n  Dónde puede mejorar CEREBRO: ${skillImpact(item)}\n  Impacto medido: ${measuredImpact(item)}\n  Decisión de CEREBRO: ${decision(kind)}\n  Siguiente paso: ${nextStep(kind,item)}\n  ¿Necesitas hacer algo?: ${ownerAction(kind,item)}`;
}

function countRelated(runs,commits,words){return runs.filter(r=>matches(`${r.name} ${r.path} ${r.display_title}`,words)).length+commits.filter(c=>matches(c?.commit?.message||c?.message,words)).length;}
function plainAreaSummary(runs,commits,words,label){const count=countRelated(runs,commits,words);return count?[`Se han registrado ${count} movimientos relacionados con ${label}. El detalle técnico queda guardado para auditoría y solo aparece si aporta valor o existe un problema.`]:[`Sin novedades relevantes de ${label} en la ventana revisada.`];}
function safeNextAction(code){const known={'TERMINAL_HOLD_CONTINUE_OTHER_SAFE_WORK':'CEREBRO seguirá con otras habilidades seguras; las aparcadas permanecen apartadas.','WAITING_SAFE_HANDLER':'CEREBRO ejecutará el siguiente bloque seguro disponible.','CONTINUE_SAFE_WORK':'CEREBRO seguirá trabajando automáticamente dentro de LAB/PREPROD.'};if(known[text(code)])return known[text(code)];return code?'CEREBRO seguirá con el siguiente trabajo seguro registrado. El código técnico queda en auditoría.':'No hay un siguiente trabajo del ciclo de skills registrado en este momento.';}

export function buildRepoDailySummary({runs=[],commits=[],skillState={},communicationState={}}={}){
  const completedRuns=runs.filter(r=>r?.status==='completed');
  const failed=completedRuns.filter(r=>!['success','skipped','neutral'].includes(r?.conclusion));
  const inFlight=listValues(skillState?.in_flight),waitingHuman=listValues(skillState?.waiting_human),waitingSafe=listValues(skillState?.waiting_safe_handler),holds=listValues(skillState?.terminal_hold),completedSkills=listValues(skillState?.completed);
  const pending=listValues(communicationState?.pending);
  const groups={IN_FLIGHT:inFlight,WAITING_SAFE:waitingSafe,WAITING_HUMAN:waitingHuman,HOLD:holds,COMPLETED:completedSkills};
  const snapshot=currentSnapshot(groups);
  const previous=communicationState?.skill_digest_snapshot??{};
  const changedIds=new Set(changedSkillIds(snapshot,previous));
  const firstSnapshot=!Object.keys(previous).length;
  const costs=[...inFlight,...waitingHuman,...waitingSafe,...holds,...completedSkills].map(x=>Number(x?.additional_cost_eur??0)).filter(Number.isFinite);
  const visibleCost=costs.reduce((a,b)=>a+b,0);
  const commitsToday=uniq(commits.map(c=>{const m=text(c?.commit?.message||c?.message).split('\n')[0];return m||null;})).slice(0,30);

  const skillCards=[];const seen=new Set();
  const add=(kind,item)=>{const id=stableSkillId(item);if(seen.has(id))return;seen.add(id);const important=kind==='WAITING_HUMAN'||kind==='IN_FLIGHT'||kind==='WAITING_SAFE'||changedIds.has(id)||firstSnapshot;if(important)skillCards.push(buildHumanSkillCard(item,kind,{changed:changedIds.has(id)||firstSnapshot}));};
  inFlight.forEach(x=>add('IN_FLIGHT',x));waitingSafe.forEach(x=>add('WAITING_SAFE',x));waitingHuman.forEach(x=>add('WAITING_HUMAN',x));holds.forEach(x=>add('HOLD',x));completedSkills.slice(-3).forEach(x=>add('COMPLETED',x));

  const allVisibleIds=new Set([...inFlight,...waitingHuman,...waitingSafe,...holds,...completedSkills].map(stableSkillId));
  const unchangedCount=[...allVisibleIds].filter(id=>!changedIds.has(id)).length;
  const activeCount=inFlight.length+waitingSafe.length;
  const newlyCompleted=completedSkills.filter(x=>changedIds.has(stableSkillId(x))).length;
  const newCapability=newlyCompleted?`CEREBRO tiene ${newlyCompleted} capacidad${newlyCompleted===1?'':'es'} recién terminada${newlyCompleted===1?'':'s'} dentro del alcance probado.`:'No doy por ganada ninguna capacidad nueva sin evidencia de cierre en esta ventana.';
  const humanSummary=[
    `RESUMEN DE 20 SEGUNDOS: ${newCapability}`,
    `Ahora mismo hay ${activeCount} skill${activeCount===1?'':'s'} avanzando, ${waitingHuman.length} esperando tu decisión y ${holds.length} aparcada${holds.length===1?'':'s'}.`,
    changedIds.size?`Han cambiado ${changedIds.size} skill${changedIds.size===1?'':'s'} desde la última fotografía comunicada.`:'No hay cambios de estado de skills frente a la última fotografía comunicada.',
    unchangedCount?`${unchangedCount} skill${unchangedCount===1?' permanece':'s permanecen'} sin cambios y no se repiten con detalle.`:'No hay skills sin cambios que ocultar.',
    pending.length?`Carlos: SÍ hay ${pending.length} autorización${pending.length===1?'':'es'} pendiente${pending.length===1?'':'s'}.`:'Carlos: NO necesitas hacer nada por autorizaciones en este momento.',
    `Coste adicional visible del ciclo de skills: ${visibleCost.toFixed(2)} €.`
  ];

  const holdsHuman=[...waitingHuman.map(x=>`${humanName(x)} necesita tu decisión por ${text(x.human_required)||'una excepción humana real'}.`),...pending.map(x=>`Hay una autorización pendiente relacionada con ${text(x.human_alias)||text(x.technical_id)||'una acción de CEREBRO'}.`),holds.length?`${holds.length} habilidad${holds.length===1?' está':'es están'} aparcada${holds.length===1?'':'s'}; no ocupan el correo salvo cambio relevante.`:null].filter(Boolean);

  return {
    human:humanSummary,
    published:[commitsToday.length?`Se han registrado ${commitsToday.length} cambios técnicos. El detalle queda auditado y no se vuelca al correo salvo que sea necesario.`:'No se han registrado cambios nuevos en el repositorio principal durante la ventana revisada.'],
    failures:[failed.length?`Hay ${failed.length} ejecución${failed.length===1?'':'es'} con fallo o cancelación. CEREBRO debe diagnosticarla; si requiere tu intervención aparecerá expresamente.`:'Sin fallos técnicos relevantes registrados en la ventana revisada.'],
    seo_web:plainAreaSummary(runs,commits,['seo','wordpress','web','landing','gsc','city'],'SEO y web'),
    app_crm:plainAreaSummary(runs,commits,['app','crm','supabase','session context'],'App, CRM y datos'),
    automations:plainAreaSummary(runs,commits,['automation','automat','integration','bridge','connector'],'automatizaciones e integraciones'),
    skills_engines:skillCards.length?skillCards:['No hay cambios relevantes de skills que necesiten una ficha detallada hoy.'],
    training_learning:plainAreaSummary(runs,commits,['training','learning','learn','rsi','meta'],'aprendizaje y entrenamiento'),
    holds_human_required:holdsHuman.length?holdsHuman:['No hay decisiones humanas nuevas que requieran tu atención.'],
    cost:[`Coste adicional registrado en los elementos visibles del ciclo de skills: ${visibleCost.toFixed(2)} €.`],
    next_safe_work:[safeNextAction(skillState?.last_action)],
    missing_telemetry:['Este correo solo afirma lo que tiene evidencia. IDs, ramas, commits, runs y estados internos quedan guardados para auditoría.','Si un motor todavía no emite telemetría suficiente, CEREBRO lo considera cobertura pendiente y no inventa su estado.'],
    _skill_snapshot:snapshot
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
