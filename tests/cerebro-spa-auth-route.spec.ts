import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('CEREBRO is served by the authenticated SPA route, not a shadow static page',async()=>{
  expect(fs.existsSync('public/cerebro/index.html')).toBe(false);
  const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');
  expect(shell).toContain("location.pathname.replace(/\\/+$/,'')==='/cerebro'");
  const guard=fs.readFileSync('src/RouteAccessGuard.tsx','utf8');
  expect(guard).toContain("'/cerebro'");
  expect(guard).toContain('<CerebroConsoleShell/>');
  const app=fs.readFileSync('src/App.tsx','utf8');
  expect(app).toContain("supabase.auth.getSession()");
  expect(app).toContain("fenix-session-active");
});
