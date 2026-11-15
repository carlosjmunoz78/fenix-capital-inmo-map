import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=new URL('./security-lab/20261116_session_guard_lab_v0.sql',import.meta.url);
const source=readFileSync(path,'utf8');
test('P0-A migration is LAB-only, new isolated session reader and no PROD changes',()=>{
 assert.match(source,/LAB-ONLY.*hnqlnvakzaywtafeiybt/);
 assert.match(source,/create function public\.cerebro_operativa_session_guard_lab_v0\(/);
 assert.doesNotMatch(source,/create or replace function/i);
 assert.doesNotMatch(source,/\b(drop|alter|insert|update|delete|truncate)\s+(?:table|function|from|into|schema)\b/i);
 assert.doesNotMatch(source,/cluhljgonannaafpmblx/);
});
test('P0-A SQL is fixed query over auth.sessions with two UUIDs, expiry and boolean only',()=>{
 assert.match(source,/p_session_id uuid/);
 assert.match(source,/p_user_id uuid/);
 assert.match(source,/returns boolean/i);
 assert.match(source,/security definer/i);
 assert.match(source,/set search_path = ''/i);
 assert.match(source,/from auth\.sessions s/i);
 assert.match(source,/s\.id = p_session_id/);
 assert.match(source,/s\.user_id = p_user_id/);
 assert.match(source,/s\.not_after is null or s\.not_after > pg_catalog\.now\(\)/);
 assert.doesNotMatch(source,/execute\s+format\s*\(|\bpg_read_file\b|\bcopy\b/i);
});
test('P0-A RPC denies public roles and grants EXECUTE only to internal service role',()=>{
 assert.match(source,/revoke all on function public\.cerebro_operativa_session_guard_lab_v0\(uuid,uuid\) from public, anon, authenticated;/i);
 assert.match(source,/grant execute on function public\.cerebro_operativa_session_guard_lab_v0\(uuid,uuid\) to service_role;/i);
 assert.doesNotMatch(source,/grant\s+(?:select|all privileges)\s+on\s+auth\.sessions/i);
 assert.doesNotMatch(source,/grant\s+execute\b[^;]+to\s+(anon|authenticated|public)/i);
});
