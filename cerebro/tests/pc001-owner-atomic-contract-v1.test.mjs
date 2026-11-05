import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildOwnerHealthCanaryRow,PC001_HEALTH_CANARY_V0} from '../../supabase/functions/cerebro-pc001-health-issuer-preprod-v1/core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/pc001_owner_health_atomic_candidate_v1.sql'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/cerebro-pc001-health-issuer-preprod-v1/index.ts'),'utf8');
const uuid='994233ac-b7ae-4c64-84ae-12c13d3c443e';const auth='8f956de3-3f18-4e92-acc9-907850bfa5ea';
for(const [name,pattern] of [
 ['no unguarded PROD',/environment:'PREPROD'/],
 ['Supabase authenticated user',/authClient\.auth\.getUser\(token\)/],
 ['owner actor resolved server side',/preprod_test_actor_context_by_auth_server/],
 ['owner verified as CARLOS-ADMIN',/actor\.actor_code!=='CARLOS-ADMIN'/],
 ['owner Dirección verified',/actor\.role!=='Direccion'/],
 ['owner active verified',/actor\.active!==true/],
 ['no user supplied SQL',/db\.rpc\('pc001_owner_health_enqueue_v1'/],
 ['explicit preprod health intent',/PC001_READ_HEALTH_GRANT_V1/],
 ['explicit one time/similar/exception intent',/'ONE_TIME','ALL_SIMILAR','EXCEPTION_ONLY'/],
 ['explicit revocation',/PC001_OWNER_GRANT_REVOKE_V1/],
 ['same verified actor for creation',/p_owner_auth_id:session\.user\.id,p_decision_request_id/],
 ['same verified actor for revocation',/p_owner_auth_id:session\.user\.id,p_grant_id/],
 ['same verified actor for queue',/p_owner_auth_id:session\.user\.id,p_grant_id:body\.grant_id/],
 ['server clock from backend',/now:new Date\(\)/],
 ['strict browser Origin',/req\.headers\.get\('Origin'\)!==ORIGIN/],
 ['request with exact 4 keys',/Object\.keys\(body\)\.length!==4/],
 ['request has exact device scope',/body\.device_id!==PC001_HEALTH_CANARY_V0\.device_id/],
 ['forbid direct SQL insertion',/ATOMIC_ISSUER_UNAVAILABLE/],
 ['read health only',/body\.action!=='READ_HEALTH'/],
 ['positive NO PROD flag',/prod_allowed:false/],
 ['no UI remote control',/remote_desktop_control:false/],
])test('Edge gate '+name,()=>assert.match(edge,pattern));
for(const [name,pattern] of [
 ['not applied',/CANDIDATE ONLY; NOT APPLIED/],
 ['existing schema fails closed',/PC001_PRIVATE_SCHEMA_ALREADY_EXISTS_REVIEW_REQUIRED/],
 ['private schema',/create schema cerebro_pc001_private/],
 ['schema private to client',/revoke all on schema cerebro_pc001_private from PUBLIC, anon, authenticated/],
 ['private grant table',/create table cerebro_pc001_private\.pc001_owner_health_grants_v1/],
 ['private issue log',/create table cerebro_pc001_private\.pc001_owner_health_issues_v1/],
 ['grants RLS',/alter table cerebro_pc001_private\.pc001_owner_health_grants_v1 enable row level security/],
 ['issues RLS',/alter table cerebro_pc001_private\.pc001_owner_health_issues_v1 enable row level security/],
 ['exact company',/check \(company_id='fenix'\)/],
 ['exact PC',/check \(device_id='78ca78cf158b3cda329cf39e0270f0a5'\)/],
 ['one-time permission',/approval_mode in \('ONE_TIME','ALL_SIMILAR','EXCEPTION_ONLY'\)/],
 ['one-time max usage',/check \(approval_mode='ALL_SIMILAR' or max_uses=1\)/],
 ['grants revoke flag',/revoked_at timestamptz/],
 ['grant expiry',/expires_at timestamptz not null/],
 ['grant creator verified user bind',/p_owner_auth_id uuid,p_decision_request_id uuid,p_mode text/],
 ['grant creation idempotent',/where decision_request_id=p_decision_request_id/],
 ['grant revocation',/function public\.pc001_owner_health_revoke_v1/],
 ['same verified user grant',/where grant_id=p_grant_id and owner_auth_user_id=p_owner_auth_id for update/],
 ['request replay secured',/OWNER_REQUEST_REPLAY_CONFLICT/],
 ['rate limit',/RATE_LIMIT/],
 ['single device advisory transaction lock',/pg_advisory_xact_lock\(hashtextextended\('CEREBRO-PC001-FENIX-PREPROD-HEALTH-V1'/],
 ['queued command exclusivity',/state in \('QUEUED','DELIVERED'\)/],
 ['grant consumption follows insert',/update cerebro_pc001_private\.pc001_owner_health_grants_v1 set used_count=used_count\+1/],
 ['grants and command same transaction',/insert into public\.cerebro_device_commands_preprod/],
 ['explicit invoker',/security invoker/],
 ['no client function execute rights',/revoke all on function public\.pc001_owner_health_enqueue_v1\(uuid,uuid,uuid,jsonb\) from PUBLIC,anon,authenticated/],
 ['service only execute',/grant execute on function public\.pc001_owner_health_enqueue_v1\(uuid,uuid,uuid,jsonb\) to service_role/],
 ['no PROD reference',/version='pc001-windows-v1'/],
 ['transaction',/\nbegin;[\s\S]*commit;\s*$/]
])test('SQL candidate '+name,()=>assert.match(sql,pattern));
test('no SQL security-definer escalation',()=>assert.doesNotMatch(sql,/security\s+definer/i));
test('no direct queue inserts from Edge',()=>assert.doesNotMatch(edge,/\.from\(['"]cerebro_device_commands_preprod['"]\)\.insert/));
test('no text confirmation accepted in Edge POST',()=>assert.doesNotMatch(edge,/AUTORIZO_PC001_READ_HEALTH_PREPROD_UNA_VEZ/));
test('concrete first canary is read-only',()=>{assert.equal(PC001_HEALTH_CANARY_V0.capability,'SERVICE_HEALTH');assert.equal(PC001_HEALTH_CANARY_V0.action,'READ_HEALTH')});
test('deterministic prepared command stays scoped',async()=>{
 const row=await buildOwnerHealthCanaryRow({request_id:uuid,auth_user_id:auth,now:new Date('2026-11-05T11:00:00Z')});
 assert.equal(row.environment,'PREPROD');assert.equal(row.device_id,PC001_HEALTH_CANARY_V0.device_id);assert.equal(row.payload.policy.policy_id,'pc001-readonly-preprod-v1');
 assert.equal(row.payload.policy.prod_allowed,false);assert.equal(row.payload.policy.trading_allowed,false);
 assert.equal(row.payload.policy.state_changing,false);
 assert.equal(row.payload.policy.allowed_actions.length,1);assert.equal(row.payload.policy.allowed_actions[0],'READ_HEALTH');
});