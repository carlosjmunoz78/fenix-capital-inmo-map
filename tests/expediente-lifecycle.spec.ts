import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('la ficha ofrece pausa, baja reversible y reactivación sin borrado',()=>{
  const gate=fs.readFileSync(path.resolve('src/DetailShellGate.tsx'),'utf8');
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(gate).toContain('ExpedienteLifecycleGuard');
  expect(lifecycle).toContain('Pausar');
  expect(lifecycle).toContain('Pausa indefinida');
  expect(lifecycle).toContain('Reactivar a partir de');
  expect(lifecycle).toContain('Dar de baja');
  expect(lifecycle).toContain('Reactivar expediente');
  expect(lifecycle).toContain('Cliente no compra');
  expect(lifecycle).toContain('Operación aplazada');
  expect(lifecycle).toContain('Nunca borra el expediente ni su histórico');
});

test('dar de baja usa la función canónica PROD con versión y confirmación',()=>{
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(lifecycle).toContain("fetchEnvironmentApi<StageResponse>('fenix-expediente-stage'");
  expect(lifecycle).toContain("stage=mode==='close'?'Baja':'Pausado'");
  expect(lifecycle).toContain('expected_version:version');
  expect(lifecycle).toContain('Confirmar cambio');
  expect(lifecycle).toContain('El expediente cambió mientras lo tenías abierto');
  expect(lifecycle).not.toMatch(/action:\s*['"](?:delete|archive)['"]/i);
  expect(lifecycle).not.toMatch(/method:\s*['"]DELETE['"]/i);
});

test('reactivación no inventa el estado anterior',()=>{
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(lifecycle).toContain('La reactivación queda pendiente de recuperar de forma canónica el estado anterior');
  expect(lifecycle).toContain('no inventar uno');
});
