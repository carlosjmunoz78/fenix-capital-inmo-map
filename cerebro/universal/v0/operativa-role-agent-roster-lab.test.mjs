import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import roster from '../../registry/role-agent-registry.v1.json' with {type:'json'};
const root=(p)=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
test('agents roster comes from existing real role-agent registry, not 179 engines',()=>{
 assert.equal(roster.registry_id,'CEREBRO_ROLE_AGENT_REGISTRY_V1');
 assert.equal(roster.roles.length,11);
 assert.equal(roster.roles.filter(r=>r.class==='SPECIALIST_ROLE').length,10);
 assert.equal(roster.roles.filter(r=>r.class==='AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY').length,1);
 assert(roster.roles.every(r=>r.reports_to===null&&r.reports_to_state==='UNRESOLVED'));
 assert(roster.roles.every(r=>r.company_scope==='GLOBAL'||r.company_scope==='fenix'));
});
test('owner-only preview endpoint has strict deny and is read-only',()=>{
 const src=root('api/cerebro-role-agent-roster.ts');
 assert.match(src,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(src,/OWNER_NOT_VERIFIED/);
 assert.match(src,/ctx\?\.actor_code!=='CARLOS-ADMIN'/);
 assert.match(src,/req\.method!=='GET'/);
 assert.match(src,/FENIX_OWNER_ONLY/);
 assert.match(src,/roleAgentRosterSnapshot/);
 assert.doesNotMatch(src,/service_role|SUPABASE_SERVICE|CF_WORKERS_TOKEN|DATABASE_URL/);
});
test('OPERATIVA preview includes agent view and keeps existing PROD navigation unchanged',()=>{
 const src=root('src/CerebroOperativeCockpitV3.tsx');
 assert.match(src,/CerebroRoleAgentRosterLab/);
 assert.match(src,/\['agentes','Agentes',Users\]/);
 assert.match(src,/key!=='agentes'\|\|agentRosterPreview/);
 assert.match(src,/agentRosterPreview&&company==='fenix'/);
 const client=root('src/cerebroRoleAgentRosterLabApi.ts');
 assert.match(client,/supabase\.auth\.getSession/);
 assert.match(client,/PREVIEW_ONLY_SERVER_VERIFIED/);
 const panel=root('src/CerebroRoleAgentRosterLab.tsx');
 assert.match(panel,/SIN VERIFICAR/);
 assert.match(panel,/CerebroAgentJobLivePanel/);
});
