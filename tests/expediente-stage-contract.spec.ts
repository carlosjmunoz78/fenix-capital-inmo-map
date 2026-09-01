import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('expediente detail suppresses legacy and uniform overlay chrome',()=>{
 const legacy=fs.readFileSync('src/ExpedienteLegacyChromeGuard.tsx','utf8');
 const uniform=fs.readFileSync('src/OperationalUniformityGuard.tsx','utf8');
 expect(legacy).toContain('data-expediente-detail');
 expect(legacy).toContain('.app-shell > .sidebar');
 expect(legacy).toContain('.app-shell > .main');
 expect(uniform).toContain('if(expedienteDetail)return null');
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
