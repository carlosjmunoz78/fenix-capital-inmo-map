import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente detail keeps global operational chrome visible',()=>{
 const legacy=fs.readFileSync('src/ExpedienteLegacyChromeGuard.tsx','utf8');
 const uniform=fs.readFileSync('src/OperationalUniformityGuard.tsx','utf8');
 expect(legacy).toContain("import ExpedienteRenameGuard from './ExpedienteRenameGuard'");
 expect(legacy).toContain('return <ExpedienteRenameGuard/>');
 expect(legacy).not.toContain('display:none!important');
 expect(legacy).not.toContain('data-expediente-detail');
 expect(uniform).not.toContain('if(expedienteDetail)return null');
 expect(uniform).not.toContain("document.querySelectorAll('.ops-uniform-sidebar-host,.ops-uniform-footer-host').forEach(x=>x.remove());\n   return;");
});

test('expediente journey reads live workspace and supports audited manual stage',()=>{
 const journey=fs.readFileSync('src/ExpedienteJourneyGuard.tsx','utf8');
 expect(journey).toContain('/workspace');
 expect(journey).toContain('lifecycle?.effective_stage');
 expect(journey).toContain('qa?.blockers');
 expect(journey).toContain('Qué falta:');
 expect(journey).toContain('Qué toca ahora:');
 expect(journey).toContain('fenix-expediente-stage');
 expect(journey).toContain('expected_version');
 expect(journey).toContain('Cambiar estado manualmente');
 expect(journey).toContain('section.remove()');
});

test('journey keeps stage pending until explicit save and routes the write to the current environment',()=>{
 const journey=fs.readFileSync('src/ExpedienteJourneyGuard.tsx','utf8');
 const css=fs.readFileSync('src/expediente-journey-guard.css','utf8');
 expect(journey).toContain("fetchEnvironmentApi<any>('fenix-expediente-stage'");
 expect(journey).toContain('const hasPendingChange=Boolean');
 expect(journey).toContain('disabled={busy||!hasPendingChange}');
 expect(journey).toContain("onChange={e=>{setSelected(e.target.value);setMsg('');}}");
 expect(journey).toContain("'Guardar cambio'");
 expect(journey).not.toContain('IS_PRODUCTION&&');
 expect(journey).not.toContain('SUPABASE_URL}/functions/v1/fenix-expediente-stage');
 expect(journey).toContain("r.status===409");
 expect(journey).toContain('He recargado el estado actual sin sobrescribirlo.');
 expect(journey).toMatch(/if\(r\.status>=200&&r\.status<300\)\{await refresh\(\);setMsg/);
 expect(css).toContain('grid-template-columns:minmax(0,6fr) minmax(132px,1fr)');
 expect(css).toContain('@media(max-width:1100px)');
});

test('manual stage backend is authenticated, versioned and audited',()=>{
 const edge=fs.readFileSync('supabase/functions/fenix-expediente-stage/index.ts','utf8');
 const sql=fs.readFileSync('supabase/migrations/20260901_exp_stage_control.sql','utf8');
 expect(edge).toContain('auth.auth.getUser');
 expect(edge).toContain('fenix_prod_actor_context_by_auth_server');
 expect(edge).toContain('fenix_prod_exp_stage_server');
 expect(sql).toContain('expediente_stage_history');
 expect(sql).toContain('version_conflict');
 expect(sql).toContain("a.role not in ('Direccion','Financiero')");
 expect(sql).toContain('source');
});
