import fs from 'node:fs';
import path from 'node:path';
import {
  buildHumanRequiredEmailEnvelope,
  buildDailyDigestEmail,
  evaluateStandingAuthorizationCandidate,
  isQuietHours,
  madridClockParts,
  parseApprovalCommands,
  resolveHumanAlias,
  shouldSendDailyDigest
} from '../governance/human-communication.mjs';

const SKILL_READONLY_BINDING='SKILL_AUTONOMY_READONLY_V1';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function clean(v){return typeof v==='string'?v.trim():'';}
function readJson(file,fallback={}){return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):clone(fallback);}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function effectiveTrue(...values){return values.some(v=>v===true);}

export function initialCommunicationState(now=new Date().toISOString()){
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_HUMAN_COMMUNICATION_STATE',company_id:'GLOBAL',engine_id:'HEX-001',environment:'PROD_CONTROL_PLANE',version:'1.0.0',
    updated_at:now,pending:{},authorized_actions:{},decisions:[],consumed_authorizations:[],processed_message_ids:[],standing_authorizations:{},standing_policy_proposals:{},last_digest_date:null,last_delivery_at:null,
    mail_transport:{status:'UNVERIFIED',last_success_at:null,last_error:null},
    safety:{prod_write:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0}
  };
}

function normalPurpose(item){
  const alias=resolveHumanAlias(item);
  const domain=clean(item.domain);
  if(domain) return `${alias} ayuda a CEREBRO en el área ${domain.replaceAll('-',' ')}.`;
  return `${alias} es un componente de CEREBRO. Esta petición solo cubre el alcance exacto descrito en este correo.`;
}

function requestedChange(item){
  const stage=clean(item.stage) || 'HUMAN_GATE';
  if(stage==='PREPROD_PROMOTION_REVIEW') return 'Avanzar este candidato desde la revisión actual al siguiente paso controlado permitido por su contrato.';
  return `Ejecutar la acción bloqueada en la etapa ${stage}, únicamente dentro del alcance indicado.`;
}

function canModify(item){
  const out=[];
  if(effectiveTrue(item.prod_write,item.prod_write_requested,item.evidence?.prod_write)) out.push('el recurso de producción expresamente indicado en esta autorización');
  else out.push('solo estado/evidencia del flujo autorizado; no escritura de negocio en producción');
  if(effectiveTrue(item.customer_data_requested,item.customer_data_used,item.customer_data_access,item.evidence?.customer_data_used)) out.push('los datos de cliente expresamente acotados en la autorización');
  return out;
}

function cannotModify(item){
  const out=[];
  if(!effectiveTrue(item.prod_write,item.prod_write_requested,item.evidence?.prod_write)) out.push('datos o recursos de negocio en PROD');
  if(!effectiveTrue(item.customer_data_requested,item.customer_data_used,item.customer_data_access,item.evidence?.customer_data_used)) out.push('datos de clientes');
  if(!effectiveTrue(item.trading_requested,item.trading_access,item.evidence?.trading_access)) out.push('Trading real');
  if(!effectiveTrue(item.external_skill_code_execution_requested,item.external_skill_code_execution,item.external_skill_code_executed,item.evidence?.external_skill_code_executed)) out.push('ejecución de código externo del skill');
  if(!effectiveTrue(item.paid_fallback_requested,item.paid_fallback,item.evidence?.paid_fallback)) out.push('servicios de pago o gasto adicional');
  if(!clean(item.credential_scope)&&!effectiveTrue(item.new_credentials_requested,item.new_credentials)) out.push('credenciales o secretos nuevos');
  return out;
}

function positiveRollbackGreen(item){
  return item?.rollback_green===true || item?.evidence?.rollback_green===true || item?.evidence?.rollback_status==='GREEN' || item?.evidence?.rollback_proof_status==='GREEN';
}

export function standingExecutionBinding(item){
  if((clean(item?.engine_id)||'FACT-001')!=='FACT-001') return null;
  if(clean(item?.stage)!=='PREPROD_PROMOTION_REVIEW'||clean(item?.human_required)!=='HIGH_RISK') return null;
  if(!positiveRollbackGreen(item)) return null;
  if(effectiveTrue(item?.prod_write,item?.prod_write_requested,item?.evidence?.prod_write)) return null;
  if(effectiveTrue(item?.customer_data_requested,item?.customer_data_used,item?.customer_data_access,item?.evidence?.customer_data_used)) return null;
  if(effectiveTrue(item?.external_skill_code_execution_requested,item?.external_skill_code_execution,item?.external_skill_code_executed,item?.evidence?.external_skill_code_executed)) return null;
  if(effectiveTrue(item?.trading_requested,item?.trading_access,item?.evidence?.trading_access)) return null;
  if(effectiveTrue(item?.paid_fallback_requested,item?.paid_fallback,item?.evidence?.paid_fallback)) return null;
  if(clean(item?.credential_scope)||effectiveTrue(item?.new_credentials_requested,item?.new_credentials)) return null;
  if(effectiveTrue(item?.destructive_delete,item?.destructive_delete_requested,item?.unbounded_prod_write,item?.unbounded_prod_write_requested)) return null;
  if(Number(item?.max_money_eur??0)!==0) return null;
  return SKILL_READONLY_BINDING;
}

function learningEligible(item){
  const forbidden=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
  if(forbidden.has(clean(item.human_required))) return false;
  if(effectiveTrue(item.trading_requested,item.trading_access,item.evidence?.trading_access)) return false;
  if(clean(item.credential_scope)||effectiveTrue(item.new_credentials_requested,item.new_credentials)) return false;
  if(effectiveTrue(item.destructive_delete,item.destructive_delete_requested,item.unbounded_prod_write,item.unbounded_prod_write_requested)) return false;
  return positiveRollbackGreen(item)&&Boolean(standingExecutionBinding(item));
}

export function envelopeFromHumanRequired(item){
  const rollbackGreen=positiveRollbackGreen(item);
  const binding=standingExecutionBinding(item);
  const envelope=buildHumanRequiredEmailEnvelope({
    item,
    plain_language:`CEREBRO ha llegado a un límite que no debe cruzar solo (${clean(item.human_required)||'HUMAN_REQUIRED'}). Necesita una decisión tuya para este caso concreto.`,
    purpose:normalPurpose(item),
    requested_change:requestedChange(item),
    can_modify:canModify(item),
    cannot_modify:cannotModify(item),
    risk:clean(item.human_required)||'POR_EVALUAR',
    rollback:rollbackGreen?'GREEN_VERIFICADO':'ROLLBACK_AUN_NO_VERIFICADO_COMO_GREEN',
    rollback_green:rollbackGreen,
    exact_action:requestedChange(item),
    technical_detail:{candidate_id:item.candidate_id??null,engine_id:item.engine_id??null,stage:item.stage??null,run_id:item.run_id??item.evidence?.handler_run_id??null,evidence:item.evidence??null},
    event_version:item.updated_at??item.run_id??item.evidence?.handler_run_id??null,
    standing_learning_eligible:learningEligible(item)
  });
  return Object.freeze({...envelope,standing_execution_binding:binding});
}

export function ingestSkillHumanRequired(state,skillState,now=new Date().toISOString()){
  const out=clone(state);
  out.pending=out.pending??{};
  out.authorized_actions=out.authorized_actions??{};
  out.standing_authorizations=out.standing_authorizations??{};
  for(const rawItem of Object.values(skillState?.waiting_human??{})){
    const item={...rawItem,engine_id:rawItem.engine_id??'FACT-001'};
    const env=envelopeFromHumanRequired(item);
    const activeStanding=out.standing_authorizations?.[env.scope_fingerprint];
    const binding=standingExecutionBinding(item);
    if(activeStanding?.status==='ACTIVE'&&activeStanding?.exact_scope_only===true&&binding&&activeStanding?.execution_binding===binding) continue;
    if(out.authorized_actions?.[env.approval_id]?.status==='AUTHORIZED_WAITING_EXECUTION') continue;
    if(out.decisions?.some(d=>d.approval_id===env.approval_id&&d.decision==='DENIED')) continue;
    if(!out.pending[env.approval_id]) out.pending[env.approval_id]={...env,kind:'ACTION_APPROVAL',created_at:now,delivered_at:null,status:'PENDING_OWNER'};
  }
  out.updated_at=now;
  return out;
}

function expandedExplanation(req){
  return `Este permiso vale solo para “${req.human_alias}” y únicamente para la acción “${req.requested_change}”. Si respondes AUTORIZO, CEREBRO registra una autorización de un solo uso para ${req.approval_id}; el motor que pidió el permiso debe volver a validar el mismo alcance antes de ejecutar y la autorización no se puede reutilizar para otro stage, recurso o permiso. Si respondes NO AUTORIZO, la acción seguirá bloqueada. Esta autorización no concede por sí sola acceso a nada incluido en “Qué NO puede modificar”.`;
}

function renderItem(req,index){
  const can=(req.can_modify??[]).map(x=>`  - ${x}`).join('\n')||'  - Nada no descrito expresamente.';
  const cannot=(req.cannot_modify??[]).map(x=>`  - ${x}`).join('\n')||'  - Todo lo que quede fuera del alcance exacto.';
  const explanation=req.status==='PENDING_OWNER_EXPLANATION'?`\n\nExplicación ampliada\n${req.explanation_text||expandedExplanation(req)}`:'';
  return `${index}. ${req.human_alias}\n\nEn palabras normales\n${req.plain_language}\n\nPara qué sirve\n${req.purpose}\n\nQué quiere hacer ahora\n${req.requested_change}\n\nQué puede modificar\n${can}\n\nQué NO puede modificar\n${cannot}\n\nRiesgo\n${req.risk}\n\nRollback\n${req.rollback}${explanation}\n\nPara autorizar:\n${req.authorize_phrase}\n\nPara no autorizar:\n${req.deny_phrase}\n\nSi quieres más explicación:\n${req.explain_phrase}\n\nReferencia técnica: ${req.technical_id} · ${req.stage}\n${req.dedupe_marker}`;
}

export function buildApprovalBatch(requests,{night_batch=false,now=new Date()}={}){
  const items=[...requests];
  if(!items.length) return null;
  const local=madridClockParts(now);
  const explanationOnly=items.every(x=>x.status==='PENDING_OWNER_EXPLANATION');
  const subject=explanationOnly&&items.length===1
    ? `CEREBRO · EXPLICACIÓN · ${items[0].human_alias} · ${items[0].approval_id}`
    : items.length===1 ? items[0].subject : `CEREBRO · ${items.length} AUTORIZACIONES PENDIENTES${night_batch?' · LOTE NOCHE':''}`;
  const intro=night_batch
    ? `Te necesito. Durante la noche he agrupado ${items.length} decisiones para no enviarte correos separados. Puedes responder a este mismo correo con varias líneas de autorización.`
    : explanationOnly ? `Aquí tienes la explicación ampliada que pediste. La autorización sigue bloqueada hasta que respondas con la frase exacta.`
    : `Te necesito. Tengo ${items.length} decisión${items.length===1?'':'es'} pendiente${items.length===1?'':'s'}. Puedes responder a este mismo correo con una o varias líneas.`;
  const deliveryItems=items.map((req,index)=>({
    approval_id:req.approval_id,
    delivery_key:req.status==='PENDING_OWNER_EXPLANATION'?`EXPLAIN:${req.approval_id}:${req.explanation_requested_at??req.updated_at??req.created_at}`:`APPROVAL:${req.approval_id}`,
    text:renderItem(req,index+1)
  }));
  return {
    kind:'approval_batch',subject,intro,night_batch,local_date:local.date,approval_ids:items.map(x=>x.approval_id),items:deliveryItems,
    text:`${intro}\n\n${deliveryItems.map(x=>x.text).join('\n\n------------------------------\n\n')}\n\nIMPORTANTE: “sí”, “vale”, “ok” o “procede” no autorizan nada. Solo cuentan las frases exactas con APR.\n`
  };
}

function maybeCreateStandingProposal(out,request,now){
  const binding=request.standing_execution_binding;
  if(!binding) return;
  const evaluated=evaluateStandingAuthorizationCandidate({history:out.decisions,request,minimum:3});
  if(!evaluated.eligible) return;
  const scope=request.scope_fingerprint;
  if(out.standing_authorizations?.[scope]?.status==='ACTIVE'||out.standing_policy_proposals?.[scope]) return;
  const proposalItem={candidate_id:`standing:${scope}`,engine_id:request.technical_detail?.engine_id??'HEX-001',name:`permiso-permanente-${request.human_alias}`,human_alias:`Permiso permanente · ${request.human_alias}`,stage:'STANDING_AUTHORIZATION_ACTIVATION',human_required:'POLICY_CONFLICT',updated_at:now,authorization_class:'STANDING_AUTHORIZATION_ACTIVATION',requested_capability:scope,resource_scope:[request.technical_id],rollback_green:true};
  const proposal=buildHumanRequiredEmailEnvelope({
    item:proposalItem,event_version:scope,
    plain_language:`Has autorizado al menos 3 veces el mismo tipo de acción con rollback verificado, sin denegaciones ni incidentes. CEREBRO propone dejar de preguntarte por este alcance exacto.`,
    purpose:`Evitar autorizaciones repetitivas para ${request.human_alias} sin ampliar permisos fuera de lo ya repetidamente aprobado.`,
    requested_change:`Crear una autorización permanente únicamente para la huella ${scope} y el ejecutor ${binding}.`,
    can_modify:['la política de autorización para este alcance exacto y ejecutor ya probado'],
    cannot_modify:['cualquier alcance distinto','legal/firma','Trading real','credenciales nuevas','borrados destructivos','límites económicos'],
    risk:'POLÍTICA_ACOTADA_REQUIERE_ÚLTIMO_SÍ_EXPLÍCITO',rollback:'REVOCABLE',rollback_green:true,standing_learning_eligible:false
  });
  out.standing_policy_proposals=out.standing_policy_proposals??{};
  out.standing_policy_proposals[scope]={approval_id:proposal.approval_id,source_scope_fingerprint:scope,source_execution_binding:binding,created_at:now,status:'PENDING_OWNER'};
  out.pending[proposal.approval_id]={...proposal,kind:'STANDING_POLICY_ACTIVATION',source_scope_fingerprint:scope,source_execution_binding:binding,created_at:now,delivered_at:null,status:'PENDING_OWNER'};
}

export function applyOwnerMessages(state,messages,now=new Date().toISOString()){
  const out=clone(state);
  out.pending=out.pending??{};
  out.authorized_actions=out.authorized_actions??{};
  out.decisions=out.decisions??[];
  out.processed_message_ids=out.processed_message_ids??[];
  const processed=new Set(out.processed_message_ids);
  for(const msg of messages??[]){
    const messageId=clean(msg.message_id);
    if(!messageId||processed.has(messageId)) continue;
    const commandable=Object.fromEntries(Object.entries(out.pending).filter(([,req])=>['PENDING_OWNER','PENDING_OWNER_EXPLANATION'].includes(req?.status)));
    const parsed=parseApprovalCommands(msg.text,commandable);
    for(const cmd of parsed.accepted){
      const req=out.pending[cmd.approval_id];
      if(!req) continue;
      if(cmd.decision==='EXPLAIN_REQUESTED'){
        req.explanation_requested_at=now;
        req.explanation_text=expandedExplanation(req);
        req.delivered_at=null;
        req.status='PENDING_OWNER_EXPLANATION';
        continue;
      }
      const decision={approval_id:cmd.approval_id,decision:cmd.decision,scope_fingerprint:req.scope_fingerprint??null,technical_id:req.technical_id??null,stage:req.stage??null,decided_at:now,source:'OWNER_EMAIL_EXACT_COMMAND',rollback_green:req.rollback_green===true};
      out.decisions.push(decision);
      if(cmd.decision==='AUTHORIZED'&&req.kind==='STANDING_POLICY_ACTIVATION'){
        const scope=req.source_scope_fingerprint;
        const binding=clean(req.source_execution_binding);
        if(!scope||!binding) throw new Error('STANDING_POLICY_EXECUTION_BINDING_MISSING');
        out.standing_authorizations=out.standing_authorizations??{};
        out.standing_authorizations[scope]={status:'ACTIVE',activated_at:now,approval_id:req.approval_id,scope_fingerprint:scope,execution_binding:binding,revocable:true,exact_scope_only:true};
        if(out.standing_policy_proposals?.[scope]) out.standing_policy_proposals[scope].status='ACTIVE';
        delete out.pending[cmd.approval_id];
        continue;
      }
      if(cmd.decision==='AUTHORIZED'&&req.kind==='ACTION_APPROVAL'){
        req.status='AUTHORIZED_WAITING_EXECUTION';
        req.authorized_at=now;
        out.authorized_actions[cmd.approval_id]={approval_id:cmd.approval_id,status:'AUTHORIZED_WAITING_EXECUTION',scope_fingerprint:req.scope_fingerprint,technical_id:req.technical_id,stage:req.stage,human_alias:req.human_alias,authorized_at:now,source:'OWNER_EMAIL_EXACT_COMMAND',one_time:true,rollback_green:req.rollback_green===true};
        maybeCreateStandingProposal(out,req,now);
        continue;
      }
      if(cmd.decision==='DENIED') delete out.pending[cmd.approval_id];
    }
    processed.add(messageId);
  }
  out.processed_message_ids=[...processed].slice(-1000);
  out.updated_at=now;
  return out;
}

export function markAuthorizedActionConsumed(state,approvalId,{execution_id=null,now=new Date().toISOString()}={}){
  const out=clone(state);
  const action=out.authorized_actions?.[approvalId];
  if(!action||action.status!=='AUTHORIZED_WAITING_EXECUTION') return Object.freeze({state:out,consumed:false,reason:'AUTHORIZED_ACTION_NOT_AVAILABLE'});
  action.status='CONSUMED'; action.execution_id=execution_id; action.consumed_at=now;
  out.consumed_authorizations=out.consumed_authorizations??[];
  out.consumed_authorizations.push({...action});
  if(out.pending) delete out.pending[approvalId];
  out.updated_at=now;
  return Object.freeze({state:out,consumed:true,reason:'CONSUMED'});
}

export function approvedDecisionEvents(state){
  return Object.values(state.authorized_actions??{}).filter(x=>x.status==='AUTHORIZED_WAITING_EXECUTION').map(x=>({...x,authorization_applies_only_to_exact_approval_id_and_scope:true}));
}

export function prepareOutbound(state,{now=new Date(),repoSummary={}}={}){
  const out=clone(state);
  const quiet=isQuietHours(now);
  const unsent=Object.values(out.pending??{}).filter(x=>['PENDING_OWNER','PENDING_OWNER_EXPLANATION'].includes(x.status)&&!x.delivered_at).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.approval_id).localeCompare(String(b.approval_id)));
  let approvalMail=null;
  if(!quiet&&unsent.length){
    const local=madridClockParts(now);
    const morning=local.hour===8;
    approvalMail=buildApprovalBatch(unsent,{night_batch:morning,now});
    for(const req of unsent) out.pending[req.approval_id].delivered_at=now.toISOString();
    out.last_delivery_at=now.toISOString();
  }
  let digestMail=null;
  if(shouldSendDailyDigest({now,last_digest_date:out.last_digest_date})){
    const digest=buildDailyDigestEmail({date:madridClockParts(now).date,summary:repoSummary});
    const labels={human:'EN PALABRAS NORMALES',published:'PUBLICADO O CAMBIADO',failures:'FALLOS E INCIDENCIAS',seo_web:'SEO Y WEB',app_crm:'APP Y CRM',automations:'AUTOMATIZACIONES E INTEGRACIONES',skills_engines:'SKILLS Y MOTORES',training_learning:'TRAINING Y APRENDIZAJE',holds_human_required:'HOLDS Y HUMAN_REQUIRED',cost:'COSTE ADICIONAL',next_safe_work:'SIGUIENTE TRABAJO SEGURO',missing_telemetry:'COBERTURA / TELEMETRÍA PENDIENTE'};
    const body=[];
    for(const [key,label] of Object.entries(labels)){const rows=digest.sections[key]??[];body.push(`${label}\n${rows.length?rows.map(x=>`- ${x}`).join('\n'):'- Sin novedades registradas en esta sección.'}`);}
    digestMail={kind:'daily_digest',digest_date:digest.date,delivery_key:`DIGEST:${digest.date}`,subject:digest.subject,text:`Resumen diario único de CEREBRO.\n\n${body.join('\n\n')}\n`};
    out.last_digest_date=digest.date;
  }
  out.updated_at=now.toISOString();
  return {state:out,approvalMail,digestMail,decisionEvents:approvedDecisionEvents(out)};
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=arg('--state'); const skillStatePath=arg('--skill-state'); const messagesPath=arg('--messages'); const summaryPath=arg('--summary'); const outputDir=arg('--output-dir')??'artifacts/communication';
  const nowArg=arg('--now'); const now=nowArg?new Date(nowArg):new Date();
  let state=readJson(statePath,initialCommunicationState(now.toISOString()));
  const skillState=readJson(skillStatePath,{});
  state=ingestSkillHumanRequired(state,skillState,now.toISOString());
  state=applyOwnerMessages(state,readJson(messagesPath,[]),now.toISOString());
  const prepared=prepareOutbound(state,{now,repoSummary:readJson(summaryPath,{})});
  fs.mkdirSync(outputDir,{recursive:true});
  writeJson(path.join(outputDir,'state.after.json'),prepared.state);
  writeJson(path.join(outputDir,'decision-events.json'),prepared.decisionEvents);
  if(prepared.approvalMail) writeJson(path.join(outputDir,'approval-mail.json'),prepared.approvalMail);
  if(prepared.digestMail) writeJson(path.join(outputDir,'digest-mail.json'),prepared.digestMail);
  console.log(JSON.stringify({pending:Object.keys(prepared.state.pending??{}).length,authorized_waiting_execution:Object.values(prepared.state.authorized_actions??{}).filter(x=>x?.status==='AUTHORIZED_WAITING_EXECUTION').length,approval_mail:Boolean(prepared.approvalMail),digest_mail:Boolean(prepared.digestMail),decisions:prepared.state.decisions?.length??0,quiet:isQuietHours(now)}));
}