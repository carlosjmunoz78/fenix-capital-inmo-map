/**
 * P0 · Immutable, zero-I/O-to-PROD release recovery proof for PR #75.
 * Uses git history and local files only. No network, credentials, DB or writes.
 *
 * It does NOT claim transactional E2E, billed costs or App/CRM physical rollback.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const BASE='a51dd14eac11f02424dce5db426346b041c1824f';
const STAGED='7163dccd962a19fbd5301b14fcacacf08b7245ea';
const originalDeploy='dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ';
const stagedDeploy='dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h';
function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();}
function source(path){return readFileSync(path,'utf8');}
const allowed={
  '.github/workflows/cerebro-operativa-directory-minimal-pr.yml':'A',
  '.github/workflows/cerebro-operativa-directory-stage-no-domain.yml':'A',
  'api/cerebro-agent-directory.ts':'A',
  'api/cerebro-preview-owner.ts':'M',
  'cerebro/registry/seo001-role-templates-191.sourced.v1.json':'A',
  'cerebro/registry/social-facebook-agent-role-design.v1.json':'A',
  'cerebro/registry/social-facebook-financial-real-estate-components.v1.json':'A',
  'cerebro/registry/social-ig-linkedin-1177-source-components.v1.json':'A',
  'cerebro/universal/v0/OPERATIVA_MINIMAL_OWNER_DIRECTORY_RELEASE_2026-11-17.md':'A',
  'cerebro/universal/v0/operativa-owner-directory-minimal.acceptance.mjs':'A',
  'src/CerebroOperativeCockpitV3.tsx':'M',
  'src/CerebroRoleAgentRosterReadonly.tsx':'A',
  'src/cerebro-role-agent-roster-readonly.css':'A',
  'src/cerebroAgentDirectoryApi.ts':'A',
  '.github/workflows/cerebro-operativa-app-crm-recovery-gate-20261118.yml':'A',
  'cerebro/universal/v0/OPERATIVA_APP_CRM_RECOVERY_CONTRACT_2026-11-18.md':'A',
  'cerebro/universal/v0/operativa-app-crm-recovery-check.mjs':'A'
};
assert.equal(Object.keys(allowed).length,17);
assert.doesNotThrow(()=>git('cat-file','-e',BASE+'^{commit}'));
assert.doesNotThrow(()=>git('cat-file','-e',STAGED+'^{commit}'));
assert.doesNotThrow(()=>git('merge-base','--is-ancestor',STAGED,'HEAD'));
const changed=git('diff','--name-status',BASE,'HEAD').split('\n').map(s=>s.split('\t'));
assert.equal(changed.length,17,'Do not admit extra modified or removed files');
const actual=new Map(changed.map(([status,path])=>[path,status]));
for(const [path,status] of Object.entries(allowed)){
 assert.equal(actual.get(path),status,'Scope drift: '+path);
}
assert.equal(actual.size,Object.keys(allowed).length);
const sinceStaged=git('diff','--name-only',STAGED,'HEAD').split('\n').sort();
assert.deepEqual(sinceStaged,[
 '.github/workflows/cerebro-operativa-app-crm-recovery-gate-20261118.yml',
 'cerebro/universal/v0/OPERATIVA_APP_CRM_RECOVERY_CONTRACT_2026-11-18.md',
 'cerebro/universal/v0/operativa-app-crm-recovery-check.mjs'
].sort(),'Original owner-tested runtime must remain byte-identical');
console.log('PASS 1/7 · 14-change owner-tested candidate plus 3 QA-only files');

const protectedPaths=[
 'src/App.tsx','src/supabase.ts','src/CerebroConsoleHost.tsx',
 'src/CerebroOperativeConsole.tsx','src/CerebroOperativeCockpitV3Bridge.tsx',
 'src/cerebroOperativaLabUniverseApi.ts','src/cerebroActivityApi.ts',
 'src/main.tsx','vercel.json','package.json','package-lock.json'
];
for(const path of protectedPaths){
 const baseline=execFileSync('git',['show',BASE+':'+path]);
 const current=readFileSync(path);
 assert.deepEqual(current,baseline,'Protected App/CRM/Auth contract changed: '+path);
}
console.log('PASS 2/7 · protected App, CRM, Auth, Gateway clients, routing and lockfile unchanged');

const app=source('src/App.tsx'),supabase=source('src/supabase.ts');
for(const route of ['/inicio','/expedientes','/bancos','/contactos','/inmobiliarias','/tasaciones','/firmas','/documentacion']){
 assert(supabase.includes("'"+route+"'"),'Existing CRM route missing: '+route);
}
assert(app.includes("fetchAppApi<SessionContextPayload>('/session/context')"));
assert(app.includes("fetchAppApi<NavData>('/navigation')"));
assert(app.includes("ctx?.actor_code==='CARLOS-ADMIN'"));
assert(supabase.includes("fenix-app-gateway"));
console.log('PASS 3/7 · eight critical CRM routes, identity and navigation preserved');

const api=source('api/cerebro-agent-directory.ts');
const client=source('src/cerebroAgentDirectoryApi.ts');
const ui=source('src/CerebroRoleAgentRosterReadonly.tsx');
const ownerGate=source('api/cerebro-preview-owner.ts');
const cockpit=source('src/CerebroOperativeCockpitV3.tsx');
assert.match(api,/if\(req\.method!=='GET'\)return fail\(res,405,'READ_ONLY'\)/);
assert.match(api,/q\.get\('company_id'\)!=='fenix'/);
assert.match(api,/if\(body\?\.ok===false\|\|ctx\?\.actor_code!=='CARLOS-ADMIN'\)/);
assert.match(api,/read_only:true as const,executed:false as const/);
assert.match(api,/redirect:'error',cache:'no-store'/);
assert.match(client,/method:'GET',cache:'no-store'/);
assert.match(client,/supabase\.auth\.getSession\(\)/);
assert.match(ui,/CerebroRoleAgentRosterReadonly/);
assert.doesNotMatch(ui,/CerebroAgentJobLivePanel|onShowEngines|executeJob|activateEngine/);
assert.match(cockpit,/view==='agentes'/);
assert.match(ownerGate,/verifiedOwnerPreviewScope/);
assert.match(ownerGate,/ctx\.actor_code!=='CARLOS-ADMIN'/);
assert.doesNotMatch(api,/createClient\s*\(|INSERT INTO|DELETE FROM|UPDATE\s+fenix_prod|\.storage\.from\(/i);
console.log('PASS 4/7 · additive owner-only, GET-only, fail-closed directory without CRM mutations');

const routeConfig=JSON.parse(source('vercel.json'));
assert.equal(routeConfig.framework,'vite');
assert.equal(routeConfig.buildCommand,'npm run build');
assert.equal(routeConfig.outputDirectory,'dist');
assert.equal(routeConfig.git?.deploymentEnabled,false);
assert(routeConfig.headers?.some(h=>h.source==='/cerebro'&&h.headers.some(i=>i.key==='Cache-Control'&&i.value.includes('no-store'))));
const stageWorkflow=source('.github/workflows/cerebro-operativa-directory-stage-no-domain.yml');
assert(stageWorkflow.includes('vercel deploy --prebuilt --prod --skip-domain'));
assert(stageWorkflow.includes('prj_4ElVl8e2KzrHS7r5yvBGBban1DXV'));
assert(stageWorkflow.includes('PROD_PROMOTION=HOLD'));
assert(!/vercel (?:promote|rollback)\b/.test(stageWorkflow));
console.log('PASS 5/7 · baseline routing and stage --skip-domain contract preserved');

const packageJson=JSON.parse(source('package.json'));
assert.equal(packageJson.scripts.build,'tsc --noEmit && vite build');
assert.equal(packageJson.engines.node,'24.x');
assert.equal(packageJson.dependencies['@supabase/supabase-js'],'2.112.3');
assert.equal(packageJson.dependencies['react'],'19.2.8');
console.log('PASS 6/7 · pinned runtime and build tools unchanged');

assert(originalDeploy!==stagedDeploy);
assert(STAGED!==BASE);
assert(source('cerebro/universal/v0/OPERATIVA_APP_CRM_RECOVERY_CONTRACT_2026-11-18.md').includes('PROD_PROMOTION=HOLD'));
console.log('PASS 7/7 · source/deployment/rollback anchors recorded; PROD_PROMOTION=HOLD');
console.log('APP_CRM_SOURCE_RECOVERY_CONTRACT=PASS; APP_CRM_RUNTIME_RECOVERY=NOT_TESTED; PROD_UNCHANGED');
