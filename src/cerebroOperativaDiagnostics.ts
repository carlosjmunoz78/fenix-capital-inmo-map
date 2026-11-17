import type {FleetRead,FleetSource} from './cerebroFleetObserveApi';
import {triageFleet} from './cerebroOperativaTriage.ts';
import deviceHistory from '../cerebro/universal/v0/device-runtime-snapshot-fenix-2026-11-15.json' with { type: 'json' };

/** LAB read-only owner diagnostic: evidence is never promoted into inferred active agents, costs or ETAs. */
export type DiagnosticIntent='MISSING'|'FAILURES'|'CAPABILITIES'|'PROGRESS'|'ESTIMATES'|'DEVICE_HISTORY'|'JOB_EVIDENCE';
const canon=(input:string)=>input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const MUTATION=/^\s*(?:pausa|pausar|deten|detener|reanuda|reanudar|reactiva|reactivar|acelera|acelerar|prioriza|priorizar|cancela|cancelar|reintenta|reintentar|reasigna|reasignar|ejecuta|ejecutar|crea|crear|publica|publicar|activa|activar)\b/;
export function classifyDiagnosticRequest(query:string):DiagnosticIntent|null{
 if(typeof query!=='string'||query.length>4000)return null;
 const q=canon(query);
 if(!q||MUTATION.test(q))return null;
 if(/\b(dispositivos?|latidos?|heartbeats?|device bridge)\b/.test(q))return 'DEVICE_HISTORY';
 if(/\b(jarvis|productora|navegador(?:es)?|browser|dead.letter)\b/.test(q)&&
    /\b(trabajos?|jobs?|colas?|fallas?|fallos?|retenidos?|pendientes?|cuantos?|cuantas?|coste|costos?|tardan?|duracion|estado|situacion|que)\b/.test(q))return 'JOB_EVIDENCE';
 if(/\b(coste|costara|costaria|costos?|cuesta|cuestan|precio|presupuesto|tiempo|tardara|tarda|tardaria|duracion|eta|euros?|horas?|minutos?)\b/.test(q))return 'ESTIMATES';
 if(/\b(falla|fallan|fallando|fallos?|errores?|incidencias?|averiados?|rotos?|bloqueados?|atascados?|no funciona|sin funcionar)\b/.test(q))return 'FAILURES';
 if(/\b(faltan?|falta|necesitamos?|necesitaria|carecemos|sin agente|sin subagente|que necesitamos|que hace falta)\b/.test(q))return 'MISSING';
 if(/\b(puede|puedes|podemos|capacidades?|sabe hacer|sirve para|que hace cerebro)\b/.test(q)&&
    /\b(cerebro|hacer|capacidades?|automatiz|motor|agente)\w*/.test(q))return 'CAPABILITIES';
 if(/\b(avanzar|siguiente|prioridad|prioridades|priorizariamos|priorizarias|conviene priorizar|deberiamos priorizar|que hacer|plan de trabajo|proximos pasos|por donde seguimos)\b/.test(q))return 'PROGRESS';
 return null;
}
const maxDate=(d:string|null)=>d&&Number.isFinite(Date.parse(d))?d:'SIN_FECHA';
const short=(text:string)=>text.slice(0,95).replace(/[\u0000-\u001f]/g,' ').trim();
function evidence(read:FleetRead){
 if(read.kind!=='ready'||!read.snapshot)return null;
 const s=read.snapshot;
 const age=Date.now()-Date.parse(s.observed_at);
 if(!Number.isFinite(age)||age<0||age>300000)return null;
 const live=s.sources.filter((item):item is FleetSource=>item.state==='LIVE');
 const disconnected=s.sources.filter(item=>item.state!=='LIVE');
 return {s,live,disconnected,stamp:maxDate(s.observed_at)};
}
export function answerDiagnosticRequest(intent:DiagnosticIntent,read:FleetRead,query:string):string{
 const scoped=typeof query==='string'?query.toUpperCase().match(/\b[A-Z][A-Z0-9]{1,11}-\d{3}\b/)?.[0]:null;
 const intro=scoped?'Objetivo consultado: '+scoped+'. Esta fuente no acredita telemetría individual de ese motor. ':'';
 const data=evidence(read);
 if(!data)return intro+'DATOS EN VIVO NO DISPONIBLES ('+(read.reason||'FLEET_STALE_OR_UNAVAILABLE')+'). No se puede concluir que haya cero agentes, cero fallos ni actividad en marcha. Tiempos y costes: NO_MEDIDOS. No se ha ejecutado ninguna acción.';
 const {s,live,disconnected,stamp}=data;
 const base='Fuente: inventario propietario LAB '+stamp+'; '+live.length+' fuentes GitHub de metadatos LIVE, '+disconnected.length+' conectores SIN LECTURA. ';
 const missing=disconnected.map(item=>short(item.name||item.repo||item.platform)).slice(0,8);
 // The role registry is a limited declared mapping; absence here is not an absent agent.
 const roleMatches=scoped?s.roles.entries.filter(role=>role.engine_bindings.includes(scoped)):[];
 const declaredMappings=[...new Set(s.roles.entries.flatMap(role=>role.engine_bindings))];
 const coverage=scoped?
  roleMatches.length?
   'ASIGNACIÓN DECLARADA PARA '+scoped+' EN ESTE REGISTRO: '+
    roleMatches.slice(0,15).map(role=>role.name+' ('+role.id+')').join(', ')+
    '. Son perfiles definidos, NO procesos ejecutándose. ':
   'SIN ASIGNACIÓN DE PERFIL PARA '+scoped+' EN ESTE REGISTRO (NO demuestra ausencia global de agentes o capacidades). ':
  'Este registro relaciona '+s.roles.declared_role_profiles+' perfiles con '+declaredMappings.length+
   ' identificadores distintos de motor; NO constituye el censo global de 179 motores ni de agentes. ';
 if(intent==='JOB_EVIDENCE')return intro+base+'Los trabajos de JARVIS/navegador/productora requieren consulta del lector privado LAB; en este registro general NO hay evidencia de actividad ni costes verificables. No se ha ejecutado ninguna orden.';
 if(intent==='DEVICE_HISTORY'){
  const d=deviceHistory;
  if(d.schema!=='CEREBRO_DEVICE_RUNTIME_SNAPSHOT_V1'||d.kind!=='DATED_READ_ONLY_EVIDENCE'||
   d.company_id!=='fenix'||d.source_project_role!=='SUPABASE_LAB_NOT_PROD'||
   d.contains_device_ids!==false||d.contains_command_payloads!==false||
   d.active_agents_verified!==null||!Number.isFinite(Date.parse(d.observed_at))||
   d.environments.length!==2)return intro+base+'ARCHIVO DE DISPOSITIVOS NO VERIFICADO; sin cifras y sin ejecución.';
  const r=d.environments;
  const devices=r.reduce((v,x)=>v+x.not_revoked,0);
  const recent=r.reduce((v,x)=>v+x.heartbeat_24h,0);
  return intro+base+'AUDITORÍA FECHADA (NO EN VIVO) DE DISPOSITIVOS DEL SUPABASE LAB, observada '+d.observed_at+'. '+
   'Registros no revocados: '+devices+'; con latido en las 24 horas anteriores a esa auditoría: '+recent+'. '+
   'Esto NO acredita cero agentes; agentes y subagentes actualmente activos: DESCONOCIDOS. '+
   r.map(x=>x.environment+' (solo etiqueta histórica de BD LAB): '+x.commands_total+' órdenes históricas, '+
    x.completed+' completadas, '+x.failed+' fallidas, '+x.semantic_verified_count+
    ' resultados verificados, p50 '+x.p50_completed_seconds+' s y p90 '+x.p90_completed_seconds+
    ' s sobre '+x.comparable_successful_duration_samples+' finalizaciones exitosas comparables.').join(' ')+
   ' PREPROD no es una App PREPROD activa. No son tiempos futuros ni estimaciones de coste (NO_MEDIDO). No se ha ejecutado ninguna orden.';
 }
 if(intent==='ESTIMATES'){
  // Match only a complete workflow name from the live, authenticated source.
  // Never extrapolate a workflow timing to an engine or autonomous agent.
  const q=canon(query);
  const measured=live.flatMap(source=>(source.timing_samples||[])
   .filter(item=>q.includes(canon(item.workflow_name)))
   .map(item=>({item,source:source.name||source.repo||source.platform})))
   .sort((a,b)=>b.item.workflow_name.length-a.item.workflow_name.length)[0];
  const clock=measured?
   'TIEMPO DEL WORKFLOW GITHUB '+measured.item.workflow_name+' (NO del motor): muestra de '+measured.item.sample_size+
   ' ejecuciones exitosas de '+measured.source+', p50='+measured.item.p50_upper_bound_seconds+
   ' s, p90='+measured.item.p90_upper_bound_seconds+
   ' s. METODO: intervalo run_started_at → última actualización GitHub; cota aproximada, NO duración exacta, ni ETA futura garantizada. ':
   'TIEMPO: NO_MEDIDO para ese objetivo (faltan inicio, fin, historial por tarea, cola, capacidad y dependencias). ';
  return intro+base+clock+'ETA DEL MOTOR: SIN_BASE_SUFICIENTE. '+
   'COSTE REAL, INCREMENTAL Y DE ACELERACIÓN: NO_MEDIDOS (faltan cuota, uso y tarifa efectiva por proveedor). '+
   'Un workflow GitHub no acredita duración del motor, del agente ni de un proceso empresarial. '+
   'Siguiente paso: conectar recibos de job/run con FinOps y calcular intervalos a partir de ejecuciones reales. Ningún gasto autorizado ni realizado.';
 }
 if(intent==='MISSING')return intro+base+
  'AGENTES QUE FALTAN: NO CUANTIFICABLES aún. Hay '+s.roles.declared_role_profiles+' perfiles registrados y '+
  s.engine_registry_count+' motores lógicos DEFINIDOS, pero no existe un censo de agent_id/subagent_id enlazado a contratos de capacidad y latidos de ejecución. '+coverage+
  (missing.length?'Fuentes pendientes de conexión: '+missing.join(', ')+'. ':'')+
  'Para detectar carencias reales: definir objetivo/capacidades exigidas, inventariar ejecutores por fuente autenticada y contrastar permisos, skills, dependencias, training y tribunal. No crear agentes por intuición.';
 if(intent==='FAILURES'){
  const triage=triageFleet(read);
  if(triage.status!=='READY_PARTIAL')return intro+'DIAGNÓSTICO NO DISPONIBLE: '+triage.reason+
   '. No se ha demostrado ausencia de fallos. Ninguna acción ejecutada.';
  const incidents=triage.items.filter(item=>item.kind==='WORKFLOW_FAILURE'||item.kind==='WORKFLOW_ACTION_REQUIRED');
  const examples=incidents.slice(0,5).map(item=>short(item.title.replace('Último resultado fallido: ','').replace('Acción requerida: ',''))
   +' ['+item.reason.replace('GITHUB_RUN_','')+'] '+maxDate(item.observed_at)+
   ' '+(item.evidence_url||'SIN_URL')+'; siguiente: inspeccionar logs antes de reintentar').join(' | ');
  return intro+base+'DIAGNÓSTICO DE FALLOS: '+
   (incidents.length?triage.verified_failure_count+' últimos resultados fallidos y '+
    triage.needs_attention_count+' casos de acción requerida EN MUESTRA, NO censo global. '+examples+'. ':
    'ningún último resultado fallido acreditado en la muestra reciente; NO demuestra ausencia de fallos generales. ')+
   'Conectores sin diagnóstico acreditado: '+triage.unavailable_source_count+'. '+
   'Causa raíz, salud de agentes y tareas JOB-001: NO VERIFICADAS. La cola de reparación es PROPUESTA, NO ejecutada.';
 }
 if(intent==='CAPABILITIES')return intro+base+
  'CAPACIDADES ACREDITADAS POR ESTA LECTURA: consultar '+s.engine_registry_count+' definiciones de motores y '+s.roles.declared_role_profiles+
  ' perfiles registrados; observar muestras de workflows en '+live.length+' repositorios. '+
  'NO ACREDITADO por esta fuente: autonomía de los motores, ejecución de agentes, publicación, entrenamiento, control universal ni actividad de proveedores desconectados. '+
  coverage+'Capacidad disponible ≠ agente activo. Consulta un motor concreto para buscar evidencia adicional.';
 const triage=triageFleet(read);
 const first=triage.status==='READY_PARTIAL'?triage.items[0]:null;
 const priority=first?'PRIORIDAD ORIENTATIVA '+first.priority+': '+first.title+
  '. Próximo paso sin ejecución: '+first.next_action+
  ' ETA SIN_BASE_SUFICIENTE, COSTE NO_MEDIDO. ':'Sin prioridad calculable por fuentes actuales. ';
 return intro+base+priority+
  'SIGUIENTE AVANCE RECOMENDABLE (propuesta, no ejecución): primero enlazar fuentes privadas y latidos de agent/job/run con empresa y permisos; después verificar fallos y dependencias; '+
  'medir duración real y FinOps; finalmente habilitar priorización/aceleración/pausa sólo con adaptador certificado, recibo, readback y rollback. '+
  (missing.length?'Primeras conexiones por verificar: '+missing.join(', ')+'. ':'')+
  'No existe ETA o ROI medido para reordenar esto por beneficio económico. Staging permanece suspendida y no se activará por esta consulta.';
}
