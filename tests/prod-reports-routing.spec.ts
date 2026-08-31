import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';

test('reports use canonical PROD API and keep PRE-PROD TEST isolated',()=>{
 const runtime=fs.readFileSync(path.resolve('src/reportsRuntime.ts'),'utf8');
 expect(runtime).toContain("IS_PRODUCTION?'fenix-reports-api/reports':'fenix-reports-api-test/reports'");
 const shell=fs.readFileSync(path.resolve('src/InformesShell.tsx'),'utf8');
 expect(shell).toContain("from './reportsRuntime'");
 expect(shell).not.toContain('fenix-reports-api-test/reports');
});

test('PROD reports API requires authenticated actor',()=>{
 const api=fs.readFileSync(path.resolve('supabase/functions/fenix-reports-api/index.ts'),'utf8');
 expect(api).toContain('fenix_prod_actor_context_by_auth_server');
 expect(api).toContain('fenix_prod_reports_server');
 expect(api).toContain("if(!h.startsWith('Bearer '))");
});
