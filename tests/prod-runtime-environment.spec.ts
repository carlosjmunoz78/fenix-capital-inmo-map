import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('app.fenixcapital.es is forced to canonical PROD even if build env is missing',()=>{
 const source=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
 expect(source).toContain("window.location.hostname==='app.fenixcapital.es'");
 expect(source).toContain("https://cluhljgonannaafpmblx.supabase.co");
 expect(source).toContain("https://hnqlnvakzaywtafeiybt.supabase.co");
});

test('PROD smoke compiles with explicit PROD runtime and rejects PRE-PROD backend in bundle',()=>{
 const workflow=fs.readFileSync(path.resolve('.github/workflows/prod-runtime-smoke.yml'),'utf8');
 expect(workflow).toContain('VITE_FENIX_ENV: production');
 expect(workflow).toContain('VITE_SUPABASE_URL: https://cluhljgonannaafpmblx.supabase.co');
 expect(workflow).toContain('PREPROD_URL: https://hnqlnvakzaywtafeiybt.supabase.co');
 expect(workflow).toContain('! grep -R --fixed-strings "$PREPROD_URL" dist');
});
