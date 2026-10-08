import crypto from 'node:crypto';

const EXPLICIT_ALIASES = Object.freeze({
  'skill-creator': 'Creador de Skills',
  'github': 'Gestor de GitHub',
  'agent-browser': 'Navegador Automático',
  'supabase-postgres-best-practices': 'Buenas Prácticas Supabase',
  'obsidian': 'Memoria Obsidian',
  'kairos-lite': 'Asistente de Ingeniería Kairos',
  'reddit-content-ops': 'Operador de Contenido Reddit'
});

const COMMAND_RE = /^(AUTORIZO|NO AUTORIZO|EXPL[IÍ]CAME)\s+(APR-\d{8}-[A-F0-9]{8})$/iu;
const GENERIC_AUTH_WORD_RE = /(^|[^a-z0-9])(si|vale|ok|okay|procede|continua)([^a-z0-9]|$)/i;

function clean(value){
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedAscii(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function list(value){
  if(Array.isArray(value)) return value.map(clean).filter(Boolean);
  const one=clean(value);
  return one ? [one] : [];
}

function titleCase(value){
  return value
    .replace(/^skillwrap:/i,'')
    .replace(/^[a-z0-9-]+-skills:/i,'')
    .replace(/[_:/-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part)=>part.length <= 3 && part.toUpperCase() === part ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function isoDateCompact(value){
  const d=value ? new Date(value) : new Date();
  const safe=Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.toISOString().slice(0,10).replaceAll('-','');
}

function hash8(value){
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,8).toUpperCase();
}

export function resolveHumanAlias(skill={}){
  const explicit=clean(skill.human_alias);
  if(explicit) return explicit;

  const names=[skill.declared_name,skill.name,skill.technical_name]
    .map(clean)
    .filter(Boolean);
  for(const name of names){
    const known=EXPLICIT_ALIASES[name.toLowerCase()];
    if(known) return known;
  }

  const raw=names[0] || clean(skill.engine_id) || clean(skill.candidate_id) || clean(skill.wrapper_id) || 'Skill';
  const human=titleCase(raw);
  if(!human || human.length <= 2) return `Skill ${human || 'sin nombre'}`;
  return human;
}

export function withHumanAlias(skill={}){
  return Object.freeze({...skill,human_alias:resolveHumanAlias(skill)});
}

export function approvalScopeFingerprint(item={}){
  const scope={
    company_id:clean(item.company_id) || 'GLOBAL',
    engine_id:clean(item.engine_id) || null,
    authorization_class:clean(item.authorization_class) || null,
    requested_capability:clean(item.requested_capability) || clean(item.stage) || null,
    prod_write:Boolean(item.prod_write_requested),
    customer_data:Boolean(item.customer_data_requested),
    external_skill_code:Boolean(item.external_skill_code_execution_requested),
    trading:Boolean(item.trading_requested),
    paid:Boolean(item.paid_fallback_requested),
    credential_scope:clean(item.credential_scope) || null,
    resource_scope:list(item.resource_scope).sort(),
    max_money_eur:Number.isFinite(Number(item.max_money_eur)) ? Number(item.max_money_eur) : 0
  };
  return `SCOPE-${hash8(JSON.stringify(scope))}`;
}

export function buildApprovalId(item={}, event_version=null){
  const technical_id=clean(item.candidate_id) || clean(item.engine_id) || clean(item.wrapper_id) || clean(item.name) || 'unknown';
  const stage=clean(item.stage) || 'HUMAN_GATE';
  const version=clean(event_version) || clean(item.updated_at) || String(item.run_id ?? 'unknown');
  return `APR-${isoDateCompact(item.updated_at || null)}-${hash8(`${technical_id}|${stage}|${version}`)}`;
}

export function buildHumanRequiredEmailEnvelope({
  item={},
  plain_language,
  purpose,
  requested_change,
  can_modify=[],
  cannot_modify=[],
  risk='POR_EVALUAR',
  rollback='POR_EVALUAR',
  exact_action,
  technical_detail=null,
  event_version=null,
  standing_learning_eligible=false
}={}){
  const human_alias=resolveHumanAlias(item);
  const technical_id=clean(item.candidate_id) || clean(item.engine_id) || clean(item.wrapper_id) || clean(item.name) || 'unknown';
  const stage=clean(item.stage) || 'HUMAN_GATE';
  const human_required=clean(item.human_required) || 'HUMAN_REQUIRED';
  const version=clean(event_version) || clean(item.updated_at) || String(item.run_id ?? 'unknown');
  const approval_id=buildApprovalId(item,event_version);
  const scope_fingerprint=approvalScopeFingerprint(item);
  const dedupe_marker=`[CEREBRO-HUMAN:${approval_id}:${version}]`;
  return Object.freeze({
    approval_id,
    scope_fingerprint,
    subject:`CEREBRO · TE NECESITO · ${human_alias} · ${human_required}`,
    first_line:'Te necesito.',
    human_alias,
    technical_id,
    human_required,
    stage,
    plain_language:clean(plain_language),
    purpose:clean(purpose),
    requested_change:clean(requested_change) || clean(exact_action),
    can_modify:list(can_modify),
    cannot_modify:list(cannot_modify),
    risk:clean(risk),
    rollback:clean(rollback),
    exact_action:clean(exact_action),
    authorize_phrase:`AUTORIZO ${approval_id}`,
    deny_phrase:`NO AUTORIZO ${approval_id}`,
    explain_phrase:`EXPLICAME ${approval_id}`,
    technical_detail:technical_detail ?? null,
    standing_learning_eligible:Boolean(standing_learning_eligible),
    dedupe_marker,
    gated_action_authorized:false
  });
}

export function parseApprovalCommands(text,pendingApprovals={}){
  const pending=pendingApprovals instanceof Map ? pendingApprovals : new Map(Object.entries(pendingApprovals || {}));
  const accepted=[];
  const ignored=[];
  const seen=new Set();
  for(const rawLine of String(text ?? '').split(/\r?\n/)){
    const line=rawLine.trim();
    if(!line) continue;
    const match=line.match(COMMAND_RE);
    if(!match){
      if(GENERIC_AUTH_WORD_RE.test(normalizedAscii(line))) ignored.push({line,reason:'GENERIC_TEXT_NOT_AUTHORIZATION'});
      continue;
    }
    const verb=match[1].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const approval_id=match[2].toUpperCase();
    const dedupe=`${verb}|${approval_id}`;
    if(seen.has(dedupe)) continue;
    seen.add(dedupe);
    const request=pending.get(approval_id);
    if(!request){ ignored.push({line,approval_id,reason:'UNKNOWN_OR_CLOSED_APPROVAL_ID'}); continue; }
    const decision=verb === 'AUTORIZO' ? 'AUTHORIZED' : verb === 'NO AUTORIZO' ? 'DENIED' : 'EXPLAIN_REQUESTED';
    accepted.push({approval_id,decision,scope_fingerprint:request.scope_fingerprint ?? null,technical_id:request.technical_id ?? null});
  }
  return Object.freeze({accepted,ignored});
}

export function madridClockParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Madrid',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
  }).formatToParts(date).reduce((acc,p)=>{acc[p.type]=p.value;return acc;},{});
  return Object.freeze({date:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour),minute:Number(parts.minute)});
}

export function isQuietHours(date=new Date()){
  const {hour}=madridClockParts(date);
  return hour >= 21 || hour < 8;
}

export function shouldSendDailyDigest({now=new Date(),last_digest_date=null}={}){
  const local=madridClockParts(now);
  const reached=local.hour > 8 || (local.hour === 8 && local.minute >= 20);
  return reached && last_digest_date !== local.date;
}

export function evaluateStandingAuthorizationCandidate({history=[],request=null,minimum=3}={}){
  if(!request || request.standing_learning_eligible !== true) return Object.freeze({eligible:false,reason:'REQUEST_NOT_MARKED_ELIGIBLE'});
  const scope=request.scope_fingerprint;
  const same=(history || []).filter(x=>x?.scope_fingerprint === scope);
  const approvals=same.filter(x=>x?.decision === 'AUTHORIZED');
  const denials=same.filter(x=>x?.decision === 'DENIED');
  const incidents=same.filter(x=>x?.incident === true || x?.rollback_green === false);
  if(denials.length) return Object.freeze({eligible:false,reason:'OWNER_DENIAL_EXISTS',approvals:approvals.length});
  if(incidents.length) return Object.freeze({eligible:false,reason:'INCIDENT_OR_ROLLBACK_FAILURE_EXISTS',approvals:approvals.length});
  if(approvals.length < minimum) return Object.freeze({eligible:false,reason:'INSUFFICIENT_MATCHING_APPROVALS',approvals:approvals.length,minimum});
  return Object.freeze({eligible:true,reason:'PROPOSE_STANDING_AUTHORIZATION_ONCE',scope_fingerprint:scope,approvals:approvals.length,requires_explicit_owner_command:true});
}

export function buildDailyDigestEmail({date,summary={}}={}){
  const day=clean(date) || madridClockParts(new Date()).date;
  const sections={
    human: list(summary.human),
    published: list(summary.published),
    failures: list(summary.failures),
    seo_web: list(summary.seo_web),
    app_crm: list(summary.app_crm),
    automations: list(summary.automations),
    skills_engines: list(summary.skills_engines),
    training_learning: list(summary.training_learning),
    holds_human_required: list(summary.holds_human_required),
    cost: list(summary.cost),
    next_safe_work: list(summary.next_safe_work),
    missing_telemetry: list(summary.missing_telemetry)
  };
  return Object.freeze({
    subject:`CEREBRO · NOVEDADES DEL DÍA · ${day}`,
    date:day,
    sections,
    send_even_without_material_changes:true
  });
}
