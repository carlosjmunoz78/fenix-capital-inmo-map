import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('CEREBRO Console sends a stable per-tab session cohort header',async()=>{
  const source=read('src/cerebroConsoleApi.ts');
  expect(source).toContain("const CEREBRO_SESSION_STORAGE_KEY='cerebro_console_session_id_v1'");
  expect(source).toContain("window.sessionStorage.getItem(CEREBRO_SESSION_STORAGE_KEY)");
  expect(source).toContain("window.sessionStorage.setItem(CEREBRO_SESSION_STORAGE_KEY,created)");
  expect(source).toContain("'x-cerebro-session-id':cerebroConsoleSessionId()");
});

test('session cohort id is random and contains no user or token material',async()=>{
  const source=read('src/cerebroConsoleApi.ts');
  expect(source).toContain('crypto.randomUUID()');
  expect(source).toContain('crypto.getRandomValues(bytes)');
  const cohortBlock=source.slice(source.indexOf('function createCerebroSessionId'),source.indexOf('export type CerebroConsoleHealth'));
  expect(cohortBlock).not.toContain('access_token');
  expect(cohortBlock).not.toContain('session.user');
  expect(cohortBlock).not.toContain('email');
  expect(cohortBlock).not.toContain('phone');
});

test('authentication remains unchanged and session cohort is only an additive header',async()=>{
  const source=read('src/cerebroConsoleApi.ts');
  expect(source).toContain('Authorization:`Bearer ${token}`');
  expect(source).toContain('apikey:SUPABASE_PUBLISHABLE_KEY');
  expect(source).toContain("if(!token)return null");
  expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
});
