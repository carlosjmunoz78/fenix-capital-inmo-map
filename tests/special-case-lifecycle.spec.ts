import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const lifecycle=fs.readFileSync('src/SpecialCaseLifecycleGuard.tsx','utf8');
const main=fs.readFileSync('src/main.tsx','utf8');

test('Herencias y Obras Nuevas comparten ciclo de vida sin borrar ni inventar backend',()=>{
  expect(lifecycle).toContain('(herencias|obras-nuevas)');
  expect(lifecycle).toContain('Pausar');
  expect(lifecycle).toContain('Pausa indefinida');
  expect(lifecycle).toContain('type="date"');
  expect(lifecycle).toContain('Dar de baja');
  expect(lifecycle).toContain('Reactivar');
  expect(lifecycle).toContain('Nunca borra el caso ni su histórico');
  expect(lifecycle).toContain('conserva todos sus datos, documentos, relaciones e histórico');
  expect(lifecycle).toContain('La ejecución real queda bloqueada hasta disponer del endpoint canónico auditado de ciclo de vida');
  expect(lifecycle).not.toMatch(/method:\s*['"](?:POST|PATCH|DELETE)['"]/);
  expect(main).toContain("import SpecialCaseLifecycleGuard from './SpecialCaseLifecycleGuard';");
  expect(main).toContain('<SpecialCaseLifecycleGuard />');
});
