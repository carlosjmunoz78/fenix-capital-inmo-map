import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('altas de notaría y registro conservan aislamiento PRE-PROD mediante resolver central',async()=>{
 const src=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
 const runtime=fs.readFileSync('src/supabase.ts','utf8');
 const workflow=fs.readFileSync('.github/workflows/preprod-build.yml','utf8');
 expect(src).toContain("fetchEnvironmentApi<any>('fenix-directory-actions'");
 expect(src).toContain("def.kind==='notaria'?'notarias/create':'registros/create'");
 expect(src).not.toContain('fenix-directory-actions-test');
 expect(runtime).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':String(import.meta.env.VITE_FUNCTION_SUFFIX||'')");
 expect(workflow).toContain("VITE_FUNCTION_SUFFIX: '-test'");
});

test('PROD usa el gateway canónico y ya no necesita bloqueo temporal',async()=>{
 const src=fs.readFileSync('src/DirectoryCreateShell.tsx','utf8');
 const guard=fs.readFileSync('src/ProductionWriteSafetyGuard.tsx','utf8');
 expect(src).toContain("'fenix-directory-actions'");
 expect(src).not.toContain('fenix-directory-actions-test');
 expect(guard).not.toContain("'/notarias/nueva'");
 expect(guard).not.toContain("'/registros-propiedad/nuevo'");
});
