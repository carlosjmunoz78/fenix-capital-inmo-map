import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('casos especiales usan API PROD y nunca runtime TEST en producción',()=>{
 const src=fs.readFileSync('src/specialCasesRuntime.ts','utf8');
 expect(src).toContain("if(IS_PRODUCTION)return fetchEnvironmentApi<T>('fenix-special-cases-api',path)");
 expect(src).toContain("const api=IS_PRODUCTION?'fenix-special-cases-api':'fenix-special-cases-runtime'");
 expect(src).toContain("fetchEnvironmentApi<any>('fenix-special-cases-runtime',path,undefined,{productionAvailable:false})");
 expect(src).not.toContain('fenix-special-cases-runtime-test');
 expect(src).not.toContain('/functions/v1/');
 const resolver=fs.readFileSync('src/supabase.ts','utf8');
 expect(resolver).toContain("const FUNCTION_SUFFIX=IS_PRODUCTION?'':String(import.meta.env.VITE_FUNCTION_SUFFIX||'')");
 const api=fs.readFileSync('supabase/functions/fenix-special-cases-api/index.ts','utf8');
 expect(api).toContain('fenix_prod_special_case_create_with_people_server');
 expect(api).toContain('fenix_prod_special_case_update_server');
 expect(api).toContain("if(req.method==='OPTIONS')");
});

test('detalle operativo PROD usa contratos canónicos por recurso',()=>{
 const src=fs.readFileSync('src/OperationalRecordDetail.tsx','utf8');
 expect(src).toContain("edge<any>('fenix-task-api'");
 expect(src).toContain("edge<any>('fenix-document-actions'");
 expect(src).toContain("/tasaciones/${encodeURIComponent(id)}/status");
 expect(src).toContain("/firmas/${encodeURIComponent(id)}/schedule");
 expect(src).toContain("/firmas/${encodeURIComponent(id)}/confirm");
 expect(src).toContain("/firmas/${encodeURIComponent(id)}/close");
 expect(src).toContain("IS_PRODUCTION?await saveProd():await preprodAction");
});

test('APIs productivas versionadas autentican JWT y permiten preflight',()=>{
 for(const file of ['supabase/functions/fenix-special-cases-api/index.ts','supabase/functions/fenix-task-api/index.ts','supabase/functions/fenix-document-actions/index.ts']){
  const src=fs.readFileSync(file,'utf8');
  expect(src).toContain('auth.getUser');
  expect(src).toContain('fenix_prod_actor_context_by_auth_server');
  expect(src).toContain("req.method==='OPTIONS'");
  expect(src).not.toContain('-test');
 }
});

test('guard PROD ya no bloquea rutas con contrato canónico',()=>{
 const guard=fs.readFileSync('src/ProductionWriteSafetyGuard.tsx','utf8');
 for(const route of ['/notarias/nueva','/registros-propiedad/nuevo','/herencias/nuevo','/obras-nuevas/nuevo'])expect(guard).not.toContain(`'${route}'`);
 expect(guard).not.toContain('legacyDetail');
});
