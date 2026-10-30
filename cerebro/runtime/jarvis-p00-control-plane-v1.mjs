import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runtime-artifacts/jarvis-v1');
const baselinePath = path.join(OUT, 'p00-repository-baseline.json');
if (!fs.existsSync(baselinePath)) throw new Error('P00 baseline evidence missing');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const inv = baseline.inventories ?? {};

const count = (key) => Number(inv[key]?.count ?? 0);
const evidence = (key) => (inv[key]?.paths ?? []).slice(0, 30);
const now = new Date().toISOString();

const ledger = [
  ['P00-T001','Inventario vivo de JARVIS/CEREBRO Console existente','PARCIAL',['cerebro_files']],
  ['P00-T002','Mapa de repositorios, ramas y deployments relacionados','PARCIAL',['workflows']],
  ['P00-T003','Mapa Gateway/Context/Auth/Orchestrator/Router','PARCIAL',['gateway','auth','orchestrator','router']],
  ['P00-T004','Mapa de datos, tablas, eventos y jobs usados por interfaces','PARCIAL',['supabase','migrations','workflows']],
  ['P00-T005','Mapa de permisos/RBAC/RLS y tenants','PARCIAL',['auth','supabase','contracts']],
  ['P00-T006','Baseline de CI, E2E y performance','PARCIAL',['workflows']],
  ['P00-T007','Snapshot/backup previo a cambios','PARCIAL',['backup_rollback_rebuild']],
  ['P00-T008','STATE vivo JARVIS','HECHO',[]],
  ['P00-T009','Capability Registry JARVIS','HECHO',[]],
  ['P00-T010','Dependency Map JARVIS','HECHO',[]],
  ['P00-T011','Feature flag strategy','DEFINIDO',[]],
  ['P00-T012','Rollback master plan','DEFINIDO',['backup_rollback_rebuild']],
].map(([task_id,title,status,keys]) => ({
  task_id,title,status,
  evidence: keys.flatMap((k) => evidence(k)).slice(0,60),
  evidence_scope: status === 'PARCIAL' ? 'repository_only; live/external evidence still required' : 'generated_control_plane_artifact',
  confirmed_operational: false
}));

const capabilityRegistry = {
  schema:'JARVIS_CAPABILITY_REGISTRY_V1', updated_at:now, environment:'PREPROD',
  capabilities:[
    {id:'JARVIS-UI-SHELL',state:'PLANIFICADO',phase:'P02'},
    {id:'JARVIS-PROJECTS',state:'PLANIFICADO',phase:'P05'},
    {id:'JARVIS-ZEUS',state:'PLANIFICADO',phase:'P06'},
    {id:'JARVIS-KEYS',state:'PLANIFICADO',phase:'P07'},
    {id:'JARVIS-COMMANDS',state:'PLANIFICADO',phase:'P08'},
    {id:'JARVIS-WORK',state:'PLANIFICADO',phase:'P11-P14'},
    {id:'JARVIS-CODEX',state:'PLANIFICADO',phase:'P15-P16'},
    {id:'JARVIS-APP-FACTORY',state:'PLANIFICADO',phase:'P17'},
    {id:'JARVIS-WEB-FACTORY',state:'PLANIFICADO',phase:'P18'},
    {id:'JARVIS-SOCIAL-FACTORY',state:'PLANIFICADO',phase:'P19'},
  ],
  rule:'No capability becomes CONFIRMED_OPERATIONAL without live evidence.'
};

const dependencyMap = {
  schema:'JARVIS_DEPENDENCY_MAP_V1', updated_at:now,
  observed_repository_surfaces:{
    gateway:{count:count('gateway'),examples:evidence('gateway')},
    auth:{count:count('auth'),examples:evidence('auth')},
    orchestrator:{count:count('orchestrator'),examples:evidence('orchestrator')},
    router:{count:count('router'),examples:evidence('router')},
    browser:{count:count('browser'),examples:evidence('browser')},
    observability:{count:count('observability'),examples:evidence('observability')},
    contracts:{count:count('contracts'),examples:evidence('contracts')},
  },
  phase_edges:[
    ['P00','P01'],['P01','P02'],['P02','P03'],['P03','P04'],['P03','P05'],
    ['P05','P06'],['P05','P07'],['P05','P08'],['P06','P09'],['P09','P10'],
    ['P10','P11'],['P11','P12'],['P12','P13'],['P13','P14'],['P14','P15'],['P14','P16'],
    ['P15','P17'],['P16','P17'],['P14','P18'],['P14','P19'],['P18','P20'],['P19','P20']
  ]
};

const featureFlags = {
  schema:'JARVIS_FEATURE_FLAGS_V1', updated_at:now,
  default_policy:'OFF until PREPROD gate',
  flags:[
    'jarvis.shell','jarvis.projects','jarvis.zeus','jarvis.keys','jarvis.commands','jarvis.search',
    'jarvis.work','jarvis.codex','jarvis.browser','jarvis.app_factory','jarvis.web_factory','jarvis.social_factory'
  ].map((id) => ({id,lab:false,preprod:false,prod:false,rollback:'disable flag'}))
};

const rollback = {
  schema:'JARVIS_ROLLBACK_INDEX_V1', updated_at:now,
  code:{strategy:'isolated branch + draft PR; revert commits or close PR',production_impact:false},
  data:{strategy:'no schema mutation authorized during P00; migrations require reversible PREPROD plan',production_impact:false},
  runtime:{strategy:'JARVIS workflow isolated from historical 28-macrofront runtime until integration gate',production_impact:false},
  flags:{strategy:'default OFF; disable capability independently'},
  secrets:{strategy:'no plaintext secrets introduced; revoke/rotate through existing custody system if later required'}
};

const control = {
  schema:'JARVIS_P00_CONTROL_PLANE_V1', updated_at:now,
  status:'PARCIAL',
  p00_task_ledger:ledger,
  blocking_fact:'Repository evidence is available; live deployments, identities, databases and external services still need live evidence before P00 can be GREEN.',
  next_block:'Continue P00 live-evidence reconciliation; do not promote to P01 as phase-complete until required live checks exist.',
  production_writes:false,
  paid_ai_usd:0
};

for (const [name,obj] of Object.entries({
  'p00-control-plane.json':control,
  'jarvis-capability-registry.json':capabilityRegistry,
  'jarvis-dependency-map.json':dependencyMap,
  'jarvis-feature-flags.json':featureFlags,
  'jarvis-rollback-index.json':rollback,
})) fs.writeFileSync(path.join(OUT,name),JSON.stringify(obj,null,2));

console.log(JSON.stringify({status:control.status,ledger:ledger.map(({task_id,status})=>({task_id,status})),next_block:control.next_block},null,2));
