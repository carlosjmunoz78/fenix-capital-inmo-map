import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('la ficha ofrece pausa, baja reversible y reapertura sin borrado',()=>{
  const gate=fs.readFileSync(path.resolve('src/DetailShellGate.tsx'),'utf8');
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(gate).toContain('ExpedienteLifecycleGuard');
  expect(lifecycle).toContain('Pausar');
  expect(lifecycle).toContain('Pausa indefinida');
  expect(lifecycle).toContain('Reactivar a partir de');
  expect(lifecycle).toContain('Dar de baja');
  expect(lifecycle).toContain('Reabrir expediente');
  expect(lifecycle).toContain('Cliente no compra');
  expect(lifecycle).toContain('Operación aplazada');
  expect(lifecycle).toContain('Nunca borra el expediente ni su histórico');
});

test('el cambio sensible exige preview y ejecuta solo por contrato canónico auditado',()=>{
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(lifecycle).toContain('Preparar cambio');
  expect(lifecycle).toContain('Confirmar cambio');
  expect(lifecycle).toContain('fenix-expediente-stage');
  expect(lifecycle).toContain('expected_version');
  expect(lifecycle).toContain('canonicalCode');
  expect(lifecycle).toContain("const REACTIVATE_SENTINEL='__REACTIVATE__'");
  expect(lifecycle).toContain("mode==='reactivate'?REACTIVATE_SENTINEL:'Pausado'");
  expect(lifecycle).toContain('último estado activo real registrado');
  expect(lifecycle).not.toMatch(/action:\s*['\"](?:delete|archive)['\"]/i);
  expect(lifecycle).not.toMatch(/method:\s*['\"]DELETE['\"]/i);
});

test('la migración restaura el estado anterior desde el histórico y no inventa uno',()=>{
  const migration=fs.readFileSync(path.resolve('supabase/reactivate_exp_stage_20260907.sql'),'utf8');
  expect(migration).toContain("if v_stage='__REACTIVATE__'");
  expect(migration).toContain('fenix_prod.expediente_stage_history');
  expect(migration).toContain('select h.from_stage into v_restore');
  expect(migration).toContain("v_source text:='manual'");
  expect(migration).toContain("v_source:='reactivate'");
  expect(migration).toContain('reactivation_history_missing');
});
