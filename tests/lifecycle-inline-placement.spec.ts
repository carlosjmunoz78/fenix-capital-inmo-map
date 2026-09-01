import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('lifecycle deja de ser flotante y se inserta antes de la evidencia en expediente',()=>{
  const css=fs.readFileSync(path.resolve('src/expediente-lifecycle.css'),'utf8');
  const guard=fs.readFileSync(path.resolve('src/ExpedienteLifecycleGuard.tsx'),'utf8');
  expect(css).toContain('.exp-life{position:relative');
  expect(css).not.toContain('.exp-life{position:fixed');
  expect(guard).toContain('context-evidence-inline-host');
  expect(guard).toContain("content.insertBefore(host,evidence)");
  expect(guard).toContain('createPortal');
});

test('lifecycle de casos especiales sigue integrado y respeta tema oscuro',()=>{
  const css=fs.readFileSync(path.resolve('src/expediente-lifecycle.css'),'utf8');
  const special=fs.readFileSync(path.resolve('src/SpecialCaseLifecycleGuard.tsx'),'utf8');
  expect(special).toContain('special-case-lifecycle-host');
  expect(special).toContain('createPortal');
  expect(css).toContain("html[data-theme='dark'] .exp-life");
  expect(css).toContain('color:#f2f2f4');
});
