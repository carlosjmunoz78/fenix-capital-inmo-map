import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildCerebroAgentDirectoryV0} from '../../../api/cerebro-agent-directory.ts';
const source='cerebro/registry/operativa-provider-discovery-20261118.v1.json';
const target='cerebro/registry/operativa-profile-runtime-audit-2506.v1.jsonl';
const summaryPath='cerebro/registry/operativa-profile-runtime-audit-2506.summary.v1.json';
const docs='cerebro/universal/v0/OPERATIVA_2506_MAPEO_EVIDENCIAS_2026-11-18.md';
const provider=JSON.parse(readFileSync(source,'utf8'));
if(provider.schema!=='CEREBRO_EXECUTOR_DISCOVERY_SNAPSHOT_V1'||
  provider.cloudflare?.length!==45||provider.supabase?.length!==118)throw Error('PROVIDER_SNAPSHOT_NOT_VERIFIED');
const roles=buildCerebroAgentDirectoryV0();
if(roles.length!==2506)throw Error('ROLE_COUNT_DRIFT:'+roles.length);
const allKeys=new Set(roles.map(x=>x.kind+':'+x.id));
if(allKeys.size!==2506)throw Error('DUPLICATE_ROLE_KIND_AND_ID');
const workers=provider.cloudflare.filter(x=>typeof x.engine_id==='string'&&x.config_verified);
const engineEvidence=new Map();
for(const w of workers){
 const arr=engineEvidence.get(w.engine_id)||[];
 arr.push(w);engineEvidence.set(w.engine_id,arr);
}
const counts={};
const lines=[];
let declared=0,sourceMatches=0,exactRoleIdentifiers=0,templates=0,missing=0;
for(const role of roles){
 counts[role.family]=(counts[role.family]||0)+1;
 const configured=role.engine_ids.map(id=>({engine_id:id,provider_bindings:(engineEvidence.get(id)||[]).map(w=>({provider:w.provider,runtime_id:w.runtime_id,environment:w.environment,observed_at:w.observed_at,evidence_source:w.evidence_source}))}));
 const matches=configured.filter(x=>x.provider_bindings.length>0);
 if(role.engine_ids.length>0)declared++;
 if(matches.length>0)sourceMatches++;
 if(provider.cloudflare.some(w=>w.engine_id===role.id))exactRoleIdentifiers++;
 if(role.kind==='SUBAGENT_TEMPLATE')templates++;
 if(role.engine_ids.length===0)missing++;
 const result={
  profile_key:role.kind+':'+role.id,profile_id:role.id,profile_name:role.name,kind:role.kind,family:role.family,
  company_scope:role.company_scope,source:role.source,source_url:role.source_url,
  declared_state:role.state,definition_status:role.kind==='SUBAGENT_TEMPLATE'?'DEFINIDO':'POR_VERIFICAR',
  parent_id:role.parent_id,parent_contract:role.hierarchy_verified,
  declared_engine_ids:[...role.engine_ids],
  configured_engine_runtime_candidates:matches,
  runtime_verified:false,verified_profile_runtime_id:null,status:role.kind==='SUBAGENT_TEMPLATE'?'DEFINIDO':'POR_VERIFICAR',
  observed_at:provider.observed_at,provider_evidence_as_of:provider.observed_at,
  evidence_assessment:'Registry profile is sourced; deployed Worker settings alone do not certify a running profile; no exact profile-to-job execution attestation was provided.',
  last_run:null,last_run_result:null
 };
 lines.push(JSON.stringify(result));
}
const values=Object.values(counts);
if(values.reduce((a,b)=>a+b,0)!==2506)throw Error('FAMILY_TOTAL_DRIFT');
const summary={
 schema:'CEREBRO_PROFILE_RUNTIME_AUDIT_2506_V1',generated_by:'deterministic_repo_registry',company_id:'fenix',
 source_snapshot:source,source_snapshot_observed_at:provider.observed_at,
 sources:'GitHub pinned directory registries + read-only Cloudflare/Supabase executor discovery',
 total_logical_profiles:2506,by_family:counts,
 with_declared_engine_ids:declared,without_declared_engine_ids:missing,profile_with_at_least_one_source_configured_matching_worker_engine_id:sourceMatches,
 profiles_with_exact_engine_id_equal_to_profile_id_in_cloudflare_settings:exactRoleIdentifiers,
 templates_not_runtime_instances:templates,verified_running_profiles:0,
 provider_discovery_counts:{cloudflare_workers:provider.cloudflare.length,supabase_functions:provider.supabase.length,
  cloudflare_engine_id_bindings:workers.length,cloudflare_unique_engine_ids:engineEvidence.size},
 status:'PARTIAL_RUNTIME_EVIDENCE_NOT_ALL_AGENTS_LIVE',
 unresolved_profiles:2506-templates,
 limitations:[
  'Not proving that an engine is running from a deployed Worker, Supabase ACTIVE function, workflow name, or family association.',
  'No profile execution identity (profile_id/job_id/engine_id) was attested with freshness and contract.',
  'Do not auto-map SOC-001 roles to SOC-FB-FINANCIAL-REAL-ESTATE-V1 or SEO roles to any named jobs without explicit contract.',
  'This is a date-scoped source classification, not a live monitoring API.'
 ]
};
if(declared+missing!==2506)throw Error('DECLARATION_TOTAL_DRIFT');
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,lines.join('\n')+'\n');
writeFileSync(summaryPath,JSON.stringify(summary,null,2)+'\n');
const markdown=`# CEREBRO OS · Auditoría objetiva 2.506 perfiles · 18/11/2026

**HECHO · Inventario generado y comprobado:** ${summary.total_logical_profiles} roles lógicos, cada uno con \`profile_key\` única, familia, fuente, estado de definición y evidencia de motor declarado. Archivos: [auditoría JSONL de los 2506](../../registry/operativa-profile-runtime-audit-2506.v1.jsonl) y [resumen verificable](../../registry/operativa-profile-runtime-audit-2506.summary.v1.json).

## Distribución validada
${Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0])).map(([family,n])=>'- '+family+': '+n).join('\n')}

## Evidencia de runtime
- Perfiles con referencia explícita a un motor en su origen: **${declared}** (referencia declarativa, NO ejecución).
- Perfiles sin \`engine_ids\` declarados: **${missing}** (NO inventar asociación).
- Templates, no instancias: **${templates}**.
- Workers Cloudflare descubiertos: **45**; \`ENGINE_ID\` configurados en **${workers.length}** workers con **${engineEvidence.size}** IDs distintos; todos son evidencia de configuración y no de ejecución.
- Edge Functions Supabase registradas ACTIVE: **118**; ACTIVE significa desplegada, no ejecutando un trabajo.
- Perfiles con motor declarado que coincide exactamente con ENGINE_ID de Worker: **${sourceMatches}**.
- Identidades de perfil iguales a un ENGINE_ID de Worker: **${exactRoleIdentifiers}**.
- **Perfiles ejecutándose acreditados por identidad individual: 0**, porque ningún registro de proveedor aportó prueba de ejecución enlazada exactamente a profile_id.

## Política de acreditación
Para pasar un perfil a ACTIVO se necesitan simultáneamente: \`company_id\`, \`profile_id\`, \`engine_id\`, \`runtime_id\`, \`environment\`, \`observed_at\`, último run real + resultado + evidencia de ejecución y permisos. La coincidencia de nombre de familia, Worker desplegado, workflow creado o plantilla declarada NO es suficiente.

No se han creado Workers, Edge Functions, servidores, perfiles adicionales, servicios de pago ni permisos nuevos. El siguiente bloque deberá añadir vínculos individuales únicamente cuando el ejecutor emita o almacene el identificador exacto del perfil con un contrato firmado/validado.

**Estado: PARCIAL en autonomía, HECHO en inventario documentado y reproducible.**
`;
writeFileSync(docs,markdown);
process.stdout.write('PASS_LOGICAL_PROFILES='+roles.length+'\n');
process.stdout.write('PASS_FAMILY_DISTRIBUTION='+JSON.stringify(counts)+'\n');
process.stdout.write('PASS_SOURCE_ENGINE_REFERENCES='+declared+'\n');
process.stdout.write('PASS_VERIFIED_RUNNING_PROFILES=0\n');
