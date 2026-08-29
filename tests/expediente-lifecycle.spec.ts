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

test('el cambio sensible queda en preview hasta existir contrato canónico auditado',()=>{
  const lifecycle=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(lifecycle).toContain('Preparar cambio');
  expect(lifecycle).toContain('No se ejecuta todavía porque el contrato canónico de ciclo de vida aún no existe');
  expect(lifecycle).toContain('La ejecución real queda bloqueada hasta disponer del endpoint canónico auditado de ciclo de vida');
  expect(lifecycle).not.toMatch(/action:\s*['"](?:delete|archive)['"]/i);
  expect(lifecycle).not.toMatch(/fetch\([^\n]+method:\s*['"](?:POST|PATCH|DELETE)['"]/i);
});
