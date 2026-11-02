import crypto from 'node:crypto';

export const OBSERV001_CONTROL_PLANE_V1_CONTRACT = Object.freeze({
  engine_id: 'OBSERV-001',
  version: '1.0.0',
  company_scope: 'GLOBAL_OR_SCOPED',
  environment: 'LAB_PREPROD',
  allowed_sources: ['GITHUB_REPO','GITHUB_ACTIONS','SUPABASE_LOG','VM_LOG','CEREBRO_RUNTIME'],
  required_context: ['company_id','engine_id','environment','version'],
  required_flow_field: 'correlation_id',
  outputs: ['JSON_LOG','METRIC','TRACE','EVENT','HEALTH_SUMMARY'],
  retention_days_default: 7,
  storage: 'EPHEMERAL_OR_EXISTING_STORAGE_ONLY',
  additional_cost_eur: 0,
  prod_write_authorized: false,
  trading_access: false,
  invariant: 'normalize dispersed observability without duplicating source-of-truth or granting PROD authority'
});

const SENSITIVE = /(^|_)(secret|token|password|passwd|api[_-]?key|authorization|cookie)($|_)/i;
const stable = value => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
    : value;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, SENSITIVE.test(k) ? '[REDACTED]' : redact(v)]));
}
function requireScope(actor, scope) {
  if (!actor || !Array.isArray(actor.scopes) || !actor.scopes.includes(scope)) throw new Error(`PERMISSION_DENIED:${scope}`);
}
function requireContext(context) {
  for (const key of OBSERV001_CONTROL_PLANE_V1_CONTRACT.required_context) if (!context?.[key]) throw new Error(`INVALID_CONTEXT:${key}`);
  if (context.environment === 'PROD') throw new Error('PROD_WRITE_DENIED');
}

export class Observ001ControlPlaneV1 {
  constructor({retention_days=7,max_events=5000}={}) {
    if (!Number.isInteger(retention_days) || retention_days < 1 || retention_days > 30) throw new Error('INVALID_RETENTION');
    this.retention_days=retention_days; this.max_events=max_events; this.events=[];
  }
  ingest({actor,context,source,kind,severity='INFO',correlation_id,observed_at,payload={}}) {
    requireScope(actor,'observability:write'); requireContext(context);
    if (!OBSERV001_CONTROL_PLANE_V1_CONTRACT.allowed_sources.includes(source)) throw new Error('SOURCE_DENIED');
    if (!['JSON_LOG','METRIC','TRACE','EVENT'].includes(kind)) throw new Error('KIND_DENIED');
    if (!correlation_id || typeof correlation_id !== 'string') throw new Error('MISSING_CORRELATION_ID');
    if (!observed_at || Number.isNaN(Date.parse(observed_at))) throw new Error('INVALID_OBSERVED_AT');
    const normalized={schema_version:'1.0.0',company_id:context.company_id,engine_id:context.engine_id,environment:context.environment,version:context.version,source,kind,severity,correlation_id,observed_at,payload:redact(payload)};
    normalized.event_hash=digest(normalized);
    this.events.push(normalized); if(this.events.length>this.max_events)this.events.splice(0,this.events.length-this.max_events);
    return structuredClone(normalized);
  }
  query({actor,company_id,correlation_id=null}) {
    requireScope(actor,'observability:read'); if(!company_id)throw new Error('COMPANY_REQUIRED');
    return structuredClone(this.events.filter(e=>e.company_id===company_id&&(!correlation_id||e.correlation_id===correlation_id)));
  }
  health({actor,company_id}) {
    const rows=this.query({actor,company_id});
    const by_source={}; const by_kind={}; let errors=0;
    for(const e of rows){by_source[e.source]=(by_source[e.source]||0)+1;by_kind[e.kind]=(by_kind[e.kind]||0)+1;if(['ERROR','CRITICAL'].includes(e.severity))errors+=1;}
    const summary={engine_id:'OBSERV-001',company_id,status:errors?'DEGRADED':'GREEN',events_total:rows.length,errors_total:errors,by_source,by_kind,retention_days:this.retention_days,additional_cost_eur:0,prod_write_authorized:false,trading_access:false};
    return {...summary,trace:digest(summary)};
  }
  snapshot({actor,company_id}) { return {contract:OBSERV001_CONTROL_PLANE_V1_CONTRACT,health:this.health({actor,company_id}),events:this.query({actor,company_id})}; }
}
