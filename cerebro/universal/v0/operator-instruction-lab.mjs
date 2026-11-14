// Deterministic, strictly allowlisted owner instruction interpreter for Operativa LAB.
// This is NOT an LLM or a general engine executor. No network, secrets, URLs or writes.
const disallow=/\b(?:no|nunca|sin)\s+(?:quiero\s+)?(?:ejecutar|certificar|registrar|guardar|simular|haz|hacer)\b/i;
const banned=/\b(?:prod(?:uccion|ucción)?|publicar|publica|wordpress|staging|dinero|cobrar|transferir|borrar|eliminar|desactivar|activar|modificar|trading|comprar|venta|vender|token|password|clave|secreto|ssh|dns|http|www|ftp)\b/i;
const canon=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const plan=(code,label,requires_confirmation=false)=>({status:'PLAN_READY',environment:'LAB',company_id:'fenix',version:'0.1.0-lab',engine_id:'FACT-001',intent:code,label,requires_confirmation,additional_cost_eur:0,execution_scope:code==='STAGING_CAPTURE'?'STAGING_SUSPENSION_RECEIPT_ONLY':requires_confirmation?'FACT_REGISTRY_RECEIPT_ONLY':'OWNER_READ_OR_AUDITED_DRY_RUN',production_allowed:false,external_destination_allowed:false,staging_allowed:false});
export function planOperatorInstructionLab(text){
 if(typeof text!=='string'||text.length<1||text.length>240||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))
  return {status:'INSTRUCTION_INVALID',execution_allowed:false};
 const s=canon(text);
 if(s.length<2||s.length>220||s.includes('http ')||s.includes('https ')||s.includes('www '))
  return {status:'INSTRUCTION_INVALID',execution_allowed:false};
 // Classification is fail-closed: no requests to modify production or arbitrary engines.
 // A read-only question about suspended staging is the only accepted staging reference.
 if(/^(?:estado|ver|consultar|como esta|comprueba|comprueba el estado|consultar estado|revisar estado|estado actual) (?:de |del |la )?(?:staging|suspension de staging)$/.test(s))
  return plan('STAGING_STATUS','Consultar controles de suspensión de staging');
 // EXACT suspended-dependency evidence capture, never a request to staging.
 if(/^(?:certificar|certifica|registrar|registra|guardar|guarda) (?:la )?(?:suspension de staging|pausa de staging)$/.test(s))
  return plan('STAGING_CAPTURE','Registrar evidencia de suspensión de staging sin acceder al sitio',true);
 if(banned.test(s))return {status:'NOT_SUPPORTED_IN_LAB',execution_allowed:false,reason:'RISK_OR_NON_LAB_ACTION'};
 if(disallow.test(s))return {status:'NOT_SUPPORTED_IN_LAB',execution_allowed:false,reason:'NEGATED_COMMAND'};
 if(/^(?:ayuda|comandos|que puedes hacer|que ordenes puedo dar)$/.test(s))
  return plan('HELP','Ver órdenes disponibles');
 if(/^(?:estado|ver|consultar|listar|revisar) (?:de |del |los |la )?(?:motores|registro de motores|fabrica|fact 001|fact001)$/.test(s))
  return plan('REGISTRY_STATUS','Consultar registro de 179 motores (sin verificar ejecución)');
 if(/^(?:estado|ver|consultar|revisar) (?:de |del |los )?(?:jobs|trabajos|job 001|job001|programador)$/.test(s))
  return plan('JOB001_STATUS','Consultar controles de JOB-001 en PREPROD');
 // An individual motor can only be INSPECTED; the server must check the
 // candidate against all 179 canonical registry IDs before answering.
 const motor=/^(?:estado|ver|consultar) (?:de |del )?motor ([a-z][a-z0-9 ]{2,70})$/.exec(s);
 if(motor){
  const target_engine_id=motor[1].toUpperCase().replace(/ /g,'-');
  return {...plan('ENGINE_STATUS','Consultar estado registrado de '+target_engine_id+' (runtime no acreditado)'),target_engine_id};
 }
 if(/^(?:ultima|ultima certificacion|ver ultima certificacion|consultar ultima certificacion|ver recibo fact 001|ultimo recibo)$/.test(s))
  return plan('FACT_LATEST','Consultar justificante persistido FACT-001');
 if(/^(?:simular|simula|validar|valida) (?:orden |la orden )?(?:fact 001|fact001|certificacion fact 001)$/.test(s))
  return plan('FACT_DRY_RUN','Simular FACT-001 y guardar auditoría sin ejecutar');
 if(/^(?:certificar|certifica|ejecutar certificacion|ejecuta certificacion|registrar certificacion|guarda certificacion) (?:el |la )?(?:registro |de )?(?:fact 001|fact001)$/.test(s))
  return plan('FACT_ATTEST','Certificar registro FACT-001 con justificante duradero',true);
 return {status:'NOT_SUPPORTED_IN_LAB',execution_allowed:false,reason:'UNRECOGNIZED_INSTRUCTION'};
}
