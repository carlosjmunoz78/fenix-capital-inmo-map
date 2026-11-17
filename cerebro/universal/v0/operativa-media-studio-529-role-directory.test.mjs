import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {materializeRoles,registrySummary} from '../../media-studio/v2/registry/role-registry.mjs';
const source=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
test('UMS001 uses the existing 529-role original source, never invented 529 standalone runtimes',()=>{
 const roles=materializeRoles(),stats=registrySummary();
 assert.equal(stats.total_roles,529);
 assert.equal(roles.length,529);
 assert.equal(stats.departments,48);
 assert.equal(stats.specialists,384);
 assert.equal(stats.supervisors,32);
 assert.equal(stats.judges,48);
 assert.equal(stats.guardians,16);
 assert.equal(new Set(roles.map(x=>x.id)).size,529);
 assert.equal(roles.filter(x=>x.role_kind==='SPECIALIST').length,384);
 assert(roles.filter(x=>x.role_kind==='SPECIALIST').every(x=>typeof x.parent_id==='string'));
});
test('federated owner directory includes media roles via original runtime source, not role-id expansions',()=>{
 const s=source('api/cerebro-agent-directory.ts');
 assert.match(s,/from '\.\.\/cerebro\/media-studio\/v2\/registry\/role-registry\.mjs'/);
 assert.match(s,/materializeRoles\(\)/);
 assert.match(s,/summary\.total_roles!==529/);
 assert.match(s,/kind:child\?'SUBAGENT_ROLE':'AGENT_ROLE'/);
 assert.match(s,/family:'MEDIA_STUDIO'/);
 assert.match(s,/registered_logical_subagent_roles/);
 assert.match(s,/media_studio_source_roles/);
 assert.match(s,/total_runtime_instances:null/);
 assert.match(s,/ownerContext|OWNER_SESSION_REQUIRED/);
 assert.match(s,/req\.method!=='GET'/);
 assert.match(s,/prod|PREVIEW_ONLY/);
 assert.doesNotMatch(s,/UMS-001'\]/); // 179-engine canonical catalog does NOT include UMS-001
});
test('UI shows original producer roles and can paginate thousands of sourced records',()=>{
 const u=source('src/CerebroRoleAgentRosterLab.tsx');
 const c=source('src/cerebroAgentDirectoryApi.ts');
 assert.match(u,/Productora UMS-001/);
 assert.match(u,/SUBAGENT_ROLE/);
 assert.match(u,/onShowEngines/);
 assert.match(u,/PAGE_SIZE=25/);
 assert.match(u,/Siguiente/);
 assert.match(u,/count\?\.registered_logical_subagent_roles/);
 assert.match(c,/SUBAGENT_ROLE/);
 assert.match(c,/MEDIA_STUDIO/);
 assert.match(c,/readAgentDirectoryLab/);
});
