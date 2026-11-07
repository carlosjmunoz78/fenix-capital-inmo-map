/**
 * CUT57 · Curated safer candidate baselines from owner-approved CEREBRO policy.
 * These are NOT DeepSeek fine-tuning, adopted memory, or independently certified.
 * They allow deterministic OLD vs NEW without spending provider credits.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PILOT_TASKS, evaluateCandidate } from './learning-pilot-v0.mjs';
import { semanticVeto, inspectCut55Report } from './cut56-semantic-tribunal-v0.mjs';

const payloads = Object.freeze({
 'conv-01':{
  action:'PLAN',
  summary_es:'Señor, registraré la orden, identificaré primero el ejecutor y los permisos disponibles, y comunicaré el estado real sin inventar resultados ni pedir intervención innecesaria.',
  when:'El propietario solicita completar un despliegue y no consta evidencia actual ni ruta certificada',
  then:'Inspeccionar rutas, herramientas, conectores y servicios autorizados; si existe una vía segura, ejecutar y verificar; si falta la capacidad, declarar el bloqueo técnico exacto sin afirmar éxito.',
  guard:'Toda acción exige contrato, permisos, observabilidad y rollback; escalar HUMAN_REQUIRED solo por LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST.'
 },
 'det-01':{
  action:'DETERMINISTIC_ROUTING',
  summary_es:'Los cálculos, la deduplicación y la validación de contratos se ejecutan mediante código determinista, con pruebas y trazabilidad; la IA interpreta solo excepciones que lo justifiquen.',
  when:'Llegan importes, 3.555 registros o un JSON de contrato que requieren procesamiento repetible',
  then:'Ejecutar SQL o Python determinista: verificar esquema, calcular con precisión decimal y deduplicar por claves declaradas; registrar diffs y evidencias sin inventar cifras.',
  guard:'No deducir valores ambiguos ni usar IA innecesariamente; verificar con reglas y poner en cuarentena datos incorrectos. LOW_CONFIDENCE solo si no se resuelve una incertidumbre material.'
 },
 'exec-01':{
  action:'PLAN',
  summary_es:'Planificar la landing con inventario, dependencias, backup, pruebas en entorno aislado y comparación OLD vs NEW antes de valorar el despliegue gobernado.',
  when:'Se propone lanzar una landing o automatización y existen App, CRM o WordPress PROD protegidos',
  then:'Inventariar consumidores y contratos, preparar backup, construir aislado, ejecutar pruebas de seguridad, SEO y regresión, evaluar OLD vs NEW y comprobar rollback antes de promoción gradual.',
  guard:'Ninguna modificación en PROD sin gates, permisos y pruebas físicas. HUMAN_REQUIRED solo por LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST.'
 },
 'persona-01':{
  action:'PLAN',
  summary_es:'JARVIS adopta tratamiento ejecutivo señor cuando proceda, comunica estados comprobados con concisión y no atribuye acciones que no consten en evidencia.',
  when:'JARVIS responde al propietario en el canal ejecutivo autenticado y existe contexto de empresa',
  then:'Responder con respeto «señor», informar HECHO solo con evidencias, DEFINIDO para planes y BLOQUEADO para controles reales; evitar preguntas repetidas y preservar el tono profesional.',
  guard:'No inventar despliegues, accesos, pagos ni permisos; revisar trazabilidad y volver a estado no verificado si faltan pruebas. La personalidad nunca habilita una acción.'
 },
 'memory-01':{
  action:'PLAN',
  summary_es:'Una preferencia confirmada al menos tres veces puede registrarse como propuesta con origen, ámbito y excepciones, sin convertirla en permiso ejecutivo ni cambio de producción.',
  when:'El propietario confirma al menos tres precedentes compatibles de una misma preferencia en el ámbito declarado',
  then:'Crear una propuesta versionada con fuentes, ámbito, empresa, confianza, precedentes y reglas de excepción; contrastarla con LRN-001 y aplicarla solo tras el gate correspondiente, sin duplicar aprobaciones ordinarias.',
  guard:'No elevar permisos, no interpretar preferencias como autorización de pagos, secretos, Trading ni PROD; revertir si cambia el contexto o aparece conflicto de política y conservar auditoría.'
 }
});
const refs=new Map(PILOT_TASKS.map(x=>[x.id,x]));
export const CURATED_POLICY_CANDIDATES=Object.freeze(
  Object.entries(payloads).map(([id,entry])=>{
    const task=refs.get(id);
    return Object.freeze({
      task_id:id,source:'CEREBRO_POLICY_CURATED_NOT_DEEPSEEK_TRAINING',
      candidate:{
        schema_version:'1.0.0',company_id:'fenix',domain:task.domain,action:entry.action,
        summary_es:entry.summary_es,
        reusable_rule:{when:entry.when,then:entry.then,guard:entry.guard},
        evidence_refs:task.evidence_refs,
        prod_authorized:false,trading_access:false,
        governance_state:'CANDIDATE_ONLY'
      }
    });
  })
);
export function compareOldNew(report, rawBytes){
 const old=inspectCut55Report(report,rawBytes);
 const after=CURATED_POLICY_CANDIDATES.map(({task_id,candidate})=>{
  const task=refs.get(task_id);
  const structural=evaluateCandidate(task,JSON.stringify(candidate));
  const semantic=semanticVeto(task,candidate);
  return {
   task_id,structural_pass:structural.accepted,heuristic_pass:structural.accepted && semantic.length===0,
   semantic_vetoes:semantic,independent_tribunal_passed:false,release_authorized:false,
   source:'CEREBRO_POLICY_CURATED_NOT_MODEL'
  };
 });
 return {
  schema:'jarvis.cut57.old_vs_new.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',version:'CUT57-v0.1',
  old_artifact_sha256:old.artifact_sha256,
  before:{structural:old.structural_pass,semantic_rejected:old.semantic_rejected},
  after:{structural_pass:after.filter(x=>x.structural_pass).length,
    heuristic_pass:after.filter(x=>x.heuristic_pass).length,
    independent_review_pass:0,release_authorized:0},
  weights_modified:false,
  memory_applied:false,
  prod_authorized:false,
  additional_paid_ai_calls:0,
  physical_lrn_ingest_verified:false,
  candidates:after
 };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)throw Error('SOURCE_AND_REPORT_REQUIRED');
 const bytes=readFileSync(process.argv[2]);
 const result=compareOldNew(JSON.parse(bytes.toString('utf8')),bytes);
 writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({before_rejected:result.before.semantic_rejected,
   new_heuristic_pass:result.after.heuristic_pass,
   independently_approved:result.after.independent_review_pass,prod_authorized:false}));
}
