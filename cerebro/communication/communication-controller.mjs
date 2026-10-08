import fs from 'node:fs';
import path from 'node:path';
import {
  buildHumanRequiredEmailEnvelope,
  buildApprovalId,
  buildDailyDigestEmail,
  evaluateStandingAuthorizationCandidate,
  isQuietHours,
  madridClockParts,
  parseApprovalCommands,
  resolveHumanAlias,
  shouldSendDailyDigest
} from '../governance/human-communication.mjs';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function clean(v){return typeof v==='string'?v.trim():'';}
function readJson(file,fallback={}){return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):clone(fallback);}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}

export function initialCommunicationState(now=new Date().toISOString()){
  return {
    schema_version:'1.0.0',state_type:'CEREBRO_HUMAN_COMMUNICATION_STATE',company_id:'GLOBAL',engine_id:'HEX-001',environment:'PROD_CONTROL_PLANE',version:'1.0.0',
    updated_at:now,pending:{},decisions:[],processed_message_ids:[],standing_authorizations:{},standing_policy_proposals:{},last_digest_date:null,last_delivery_at:null,
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
  if(item.prod_write===true||item.prod_write_requested===true) out.push('el recurso de producción expresamente indicado en esta autorización');
  else out.push('solo estado/evidencia del flujo autorizado; no escritura de negocio en producción');
  if(item.customer_data_requested===true) out.push('los datos de cliente expresamente acotados en la autorización');
  return out;
}

function cannotModify(item){
  const out=[];
  if(item.prod_write!==true&&item.prod_write_requested!==true) out.push('datos o recursos de negocio en PROD');
  if(item.customer_data_requested!==true) out.push('datos de clientes');
  if(item.trading_requested!==true&&item.trading_access!==true) out.push('Trading real');
  if(item.external_skill_code_execution_requested!==true&&item.external_skill_code_execution!==true) out.push('ejecución de código externo del skill');
  if(item.paid_fallback_requested!==true&&item.paid_fallback!==true) out.push('servicios de pago o gasto adicional');
  if(!clean(item.credential_scope)) out.push('credenciales o secretos nuevos');
  return out;
}

function learningEligible(item){
  const forbidden=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
  if(forbidden.has(clean(item.human_required))) return false;
  if(item.trading_requested===true||item.trading_access===true) return false;
  if(clean(item.credential_scope)) return false;
  if(item.destructive_delete===true||item.unbounded_prod_write===true) return false;
  return item.rollback_green!==false;
}

export function envelopeFromHumanRequired(item){
  return buildHumanRequiredEmailEnvelope({
    item,
    plain_language:`CEREBRO ha llegado a un límite que no debe cruzar solo (${clean(item.human_required)||'HUMAN_REQUIRED'}). Necesita una decisión tuya para este caso concreto.`,
    purpose:normalPurpose(item),
    requested_change:requestedChange(item),
    can_modify:canModify(item),
    cannot_modify:cannotModify(item),
    risk:clean(item.human_required)||'POR_EVALUAR',
    rollback:item.rollback_green===false?'NO_VERDE':'ROLLBACK_OBLIGATORIO_ANTES_DE_EJECUTAR',
    exact_action:requestedChange(item),
    technical_detail:{candidate_id:item.candidate_id??null,engine_id:item.engine_id??null,stage:item.stage??null,run_id:item.run_id??item.evidence?.handler_run_id??null,evidence:item.evidence??null},
    event_version:item.updated_at??item.run_id??item.evidence?.handler_run_id??null,
    standing_learning_eligible:learningEligible(item)
  });
}

export function ingestSkillHumanRequired(state,skillState,now=new Date().toISOString()){
  const out=clone(state);
  out.pending=out.pending??{};
  out.standing_authorizations=out.standing_authorizations??{};
  for(const item of Object.values(skillState?.waiting_human??{})){
    const env=envelopeFromHumanRequired({...item,engine_id:item.engine_id??'FACT-001'});
    if(out.standing_authorizations?.[env.scope_fingerprint]?.status==='ACTIVE') continue;
    if(out.decisions?.some(d=>d.approval_id===env.approval_id&&['AUTHORIZED','DENIED'].includes(d.decision))) continue;
    if(!out.pending[env.approval_id]) out.pending[env.approval_id]={...env,kind:'ACTION_APPROVAL',created_at:now,delivered_at:null,status:'PENDING_OWNER'};
  }
  out.updated_at=now;
  return out;
}

function renderItem(req,index){
  const can=(req.can_modify??[]).map(x=>`  - ${x}`).join('\n')||'  - Nada no descrito expresamente.';
  const cannot=(req.cannot_modify??[]).map(x=>`  - ${x}`).join('\n')||'  - Todo lo que quede fuera del alcance exacto.';
  return `${index}. ${req.human_alias}\n\nEn palabras normales\n${req.plain_language}\n\nPara qué sirve\n${req.purpose}\n\nQué quiere hacer ahora\n${req.requested_change}\n\nQué puede modificar\n${can}\n\nQué NO puede modificar\n${cannot}\n\nRiesgo\n${req.risk}\n\nRollback\n${req.rollback}\n\nPara autorizar:\n${req.authorize_phrase}\n\nPara no autorizar:\n${req.deny_phrase}\n\nSi quieres más explicación:\n${req.explain_phrase}\n\nReferencia técnica: ${req.technical_id} · ${req.stage}\n${req.dedupe_marker}`;
}

export function buildApprovalBatch(requests,{night_batch=false,now=new Date()}={}){
  const items=[...requests];
  if(!items.length) return null;
  const local=madridClockParts(now);
  const subject=items.length===1
    ? items[0].subject
    : `CEREBRO · ${items.length} AUTORIZACIONES PENDIENTES${night_batch?' · LOTE NOCHE':''}`;
  const intro=night_batch
    ? `Te necesito. Durante la noche he agrupado ${items.length} decisiones para no enviarte correos separados. Puedes responder a este mismo correo con varias líneas de autorización.`
    : `Te necesito. Tengo ${items.length} decisión${items.length===1?'':'es'} pendiente${items.length===1?'':'s'}. Puedes responder a este mismo correo con una o varias líneas.`;
  return {
    subject,
    text:`${intro}\n\n${items.map((x,i)=>renderItem(x,i+1)).join('\n\n------------------------------\n\n')}\n\nIMPORTANTE: “sí”, “vale”, “ok” o “procede” no autorizan nada. Solo cuentan las frases exactas con APR.\n`,
    local_date:local.date,
    approval_ids:items.map(x=>x.approval_id)
  };
}

function maybeCreateStandingProposal(out,request,now){
  const evaluated=evaluateStandingAuthorizationCandidate({history:out.decisions,request,minimum:3});
  if(!evaluated.eligible) return;
  const scope=request.scope_fingerprint;
  if(out.standing_authorizations?.[scope]?.status==='ACTIVE'||out.standing_policy_proposals?.[scope]) return;
  const proposalItem={
    candidate_id:`standing:${scope}`,engine_id:request.technical_detail?.engine_id??'HEX-001',name:`permiso-permanente-${request.human_alias}`,
    human_alias:`Permiso permanente · ${request.human_alias}`,stage:'STANDING_AUTHORIZATION_ACTIVATION',human_required:'POLICY_CONFLICT',
    updated_at:now,authorization_class:'STANDING_AUTHORIZATION_ACTIVATION',requested_capability:scope,resource_scope:[request.technical_id],rollback_green:true
  };
  const proposal=buildHumanRequiredEmailEnvelope({
    item:proposalItem,event_version:scope,
    plain_language:`Has autorizado al menos 3 veces el mismo tipo de acción sin denegaciones ni incidentes. CEREBRO propone dejar de preguntarte por este alcance exacto.`,
    purpose:`Evitar autorizaciones repetitivas para ${request.human_alias} sin ampliar permisos fuera de lo ya repetidamente aprobado.`,
    requested_change:`Crear una autorización permanente únicamente para la huella ${scope}.`,
    can_modify:['la política de autorización para este alcance exacto'],
    cannot_modify:['cualquier alcance distinto','legal/firma','Trading real','credenciales nuevas','borrados destructivos','límites económicos'],
    risk:'POLÍTICA_ACOTADA_REQUIERE_ÚLTIMO_SÍ_EXPLÍCITO',rollback:'REVOCABLE',standing_learning_eligible:false
  });
  out.standing_policy_proposals=out.standing_policy_proposals??{};
  out.standing_policy_proposals[scope]={approval_id:proposal.approval_id,source_scope_fingerprint:scope,created_at:now,status:'PENDING_OWNER'};
  out.pending[proposal.approval_id]={...proposal,kind:'STANDING_POLICY_ACTIVATION',source_scope_fingerprint:scope,created_at:now,delivered_at:null,status:'PENDING_OWNER'};
}

export function applyOwnerMessages(state,messages,now=new Date().toISOString()){
  const out=clone(state);
  out.pending=out.pending??{};
  out.decisions=out.decisions??[];
  out.processed_message_ids=out.processed_message_ids??[];
  const processed=new Set(out.processed_message_ids);
  for(const msg of messages??[]){
    const messageId=clean(msg.message_id);
    if(!messageId||processed.has(messageId)) continue;
    const parsed=parseApprovalCommands(msg.text,out.pending);
    for(const cmd of parsed.accepted){
      const req=out.pending[cmd.approval_id];
      if(!req) continue;
      if(cmd.decision==='EXPLAIN_REQUESTED'){
        req.explanation_requested_at=now;
        req.delivered_at=null;
        req.status='PENDING_OWNER_EXPLANATION';
        continue;
      }
      const decision={approval_id:cmd.approval_id,decision:cmd.decision,scope_fingerprint:req.scope_fingerprint??null,technical_id:req.technical_id??null,stage:req.stage??null,decided_at:now,source:'OWNER_EMAIL_EXACT_COMMAND',rollback_green:req.rollback!=='NO_VERDE'};
      out.decisions.push(decision);
      if(cmd.decision==='AUTHORIZED'&&req.kind==='STANDING_POLICY_ACTIVATION'){
        const scope=req.source_scope_fingerprint;
        out.standing_authorizations=out.standing_authorizations??{};
        out.standing_authorizations[scope]={status:'ACTIVE',activated_at:now,approval_id:req.approval_id,revocable:true,exact_scope_only:true};
        if(out.standing_policy_proposals?.[scope]) out.standing_policy_proposals[scope].status='ACTIVE';
      }
      delete out.pending[cmd.approval_id];
      if(cmd.decision==='AUTHORIZED'&&req.kind==='ACTION_APPROVAL') maybeCreateStandingProposal(out,req,now);
    }
    processed.add(messageId);
  }
  out.processed_message_ids=[...processed].slice(-1000);
  out.updated_at=now;
  return out;
}

export function approvedDecisionEvents(state){
  return (state.decisions??[]).filter(x=>x.decision==='AUTHORIZED').map(x=>({
    approval_id:x.approval_id,decision:x.decision,scope_fingerprint:x.scope_fingerprint,technical_id:x.technical_id,stage:x.stage,decided_at:x.decided_at,
    authorization_applies_only_to_exact_approval_id_and_scope:true
  }));
}

export function prepareOutbound(state,{now=new Date(),repoSummary={}}={}){
  const out=clone(state);
  const quiet=isQuietHours(now);
  const unsent=Object.values(out.pending??{}).filter(x=>!x.delivered_at).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.approval_id).localeCompare(String(b.approval_id)));
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
    for(const [key,label] of Object.entries(labels)){
      const rows=digest.sections[key]??[];
      body.push(`${label}\n${rows.length?rows.map(x=>`- ${x}`).join('\n'):'- Sin novedades registradas en esta sección.'}`);
    }
    digestMail={subject:digest.subject,text:`Resumen diario único de CEREBRO.\n\n${body.join('\n\n')}\n`};
    out.last_digest_date=digest.date;
  }
  out.updated_at=now.toISOString();
  return {state:out,approvalMail,digestMail,decisionEvents:approvedDecisionEvents(out)};
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const statePath=arg('--state');
  const skillStatePath=arg('--skill-state');
  const messagesPath=arg('--messages');
  const summaryPath=arg('--summary');
  const outputDir=arg('--output-dir')??'artifacts/communication';
  const nowArg=arg('--now');
  const now=nowArg?new Date(nowArg):new Date();
  let state=readJson(statePath,initialCommunicationState(now.toISOString()));
  const skillState=readJson(skillStatePath,{});
  state=ingestSkillHumanRequired(state,skillState,now.toISOString());
  const messages=readJson(messagesPath,[]);
  state=applyOwnerMessages(state,messages,now.toISOString());
  const summary=readJson(summaryPath,{});
  const prepared=prepareOutbound(state,{now,repoSummary:summary});
  fs.mkdirSync(outputDir,{recursive:true});
  writeJson(path.join(outputDir,'state.after.json'),prepared.state);
  writeJson(path.join(outputDir,'decision-events.json'),prepared.decisionEvents);
  if(prepared.approvalMail) writeJson(path.join(outputDir,'approval-mail.json'),prepared.approvalMail);
  if(prepared.digestMail) writeJson(path.join(outputDir,'digest-mail.json'),prepared.digestMail);
  console.log(JSON.stringify({pending:Object.keys(prepared.state.pending??{}).length,approval_mail:Boolean(prepared.approvalMail),digest_mail:Boolean(prepared.digestMail),decisions:prepared.state.decisions?.length??0,quiet:isQuietHours(now)}));
}
