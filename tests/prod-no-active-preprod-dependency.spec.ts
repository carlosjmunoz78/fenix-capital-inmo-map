import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');

test('production runtime is hard-wired to PROD and clears retired auth cache before render',()=>{
  const supabase=read('src/supabase.ts');
  const main=read('src/main.tsx');
  expect(supabase).toContain('export const IS_PRODUCTION=true');
  expect(supabase).toContain("const AUTH_STORAGE_KEY='fenix-prod-auth-v1'");
  expect(main.indexOf("localStorage.removeItem('fenix-preprod-auth')")).toBeGreaterThan(-1);
  expect(main.indexOf("localStorage.removeItem('fenix-preprod-auth')")).toBeLessThan(main.indexOf('ReactDOM.createRoot'));
});

test('release validation workflows no longer depend on PRE-PROD credentials or endpoints',()=>{
  const candidate=read('.github/workflows/prod-preparation-build.yml');
  const smoke=read('.github/workflows/prod-runtime-smoke.yml');
  const joined=`${candidate}\n${smoke}`;
  expect(joined).not.toMatch(/APP_PREPROD|PREPROD_SUPABASE|preprod-app-phase1/i);
  expect(candidate).toContain('PROD_SUPABASE_URL');
  expect(candidate).toContain('PROD_SUPABASE_PUBLISHABLE_KEY');
  expect(candidate).toContain('NOTION_TOKEN');
  expect(candidate).toContain('https://prod.invalid');
});

test('document editing PRE-PROD branch is compile-time unreachable in production runtime',()=>{
  const viewer=read('src/DocumentViewerShell.tsx');
  const supabase=read('src/supabase.ts');
  expect(supabase).toContain('export const IS_PRODUCTION=true');
  expect(viewer).toContain("if(!IS_PRODUCTION){setMsg('La edición se habilita en PROD; PRE-PROD permanece sin escritura productiva.');return;}");
});

test('package runtime identity is production, regardless of historical lockfile package label',()=>{
  const pkg=JSON.parse(read('package.json'));
  expect(pkg.name).toBe('fenix-capital-app');
});
