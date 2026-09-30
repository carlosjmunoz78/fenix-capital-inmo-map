import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('CEREBRO is served by the authenticated SPA route, not a shadow static page',async()=>{
  expect(fs.existsSync('public/cerebro/index.html')).toBe(false);
  const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');
  expect(shell).toContain("location.pathname.replace(/\\/+$/,'')==='/cerebro'");
  expect(shell).toContain("data?.actor_code==='CARLOS-ADMIN'");
  const guard=fs.readFileSync('src/RouteAccessGuard.tsx','utf8');
  expect(guard).toContain("'/cerebro'");
  expect(guard).toContain('<CerebroConsoleShell/>');
  const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
  expect(gateway).toContain('actor==="CARLOS-ADMIN"');
  expect(gateway).toContain('reason:"OWNER_ONLY"');
  const knowledge=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/knowledge.ts','utf8');
  expect(knowledge).toContain('actorCode!=="CARLOS-ADMIN"');
  expect(knowledge).toContain('SOCIAL_SCHEDULE_DATA_SOURCE_ID');
  expect(knowledge).toContain('Programación Editorial');
  expect(knowledge).toContain('read_context');
  const api=fs.readFileSync('src/cerebroConsoleApi.ts','utf8');
  expect(api).toContain('read_context');
  expect(shell).toContain('readContext');
  const app=fs.readFileSync('src/App.tsx','utf8');
  expect(app).toContain("supabase.auth.getSession()");
  expect(app).toContain("fenix-session-active");
});
