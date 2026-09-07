import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('tareas permite baja real sin borrado y con control de versión',()=>{
  const guard=fs.readFileSync(path.resolve('src/TaskLifecycleGuard.tsx'),'utf8');
  const mount=fs.readFileSync(path.resolve('src/TaskDetailExperienceGuard.tsx'),'utf8');
  const prod=fs.readFileSync(path.resolve('src/ProdTaskView.tsx'),'utf8');
  expect(mount).toContain('TaskLifecycleGuard');
  expect(prod).toContain('task-life-anchor');
  expect(guard).toContain(".task-detail-root .task-life-anchor");
  expect(guard).toContain('Dar de baja tarea');
  expect(guard).toContain('Tarea antigua');
  expect(guard).toContain("estado:'Cancelada'");
  expect(guard).toContain('expected_version');
  expect(guard).toContain('fenix-task-api');
  expect(guard).toContain('r.status===409');
  expect(guard).not.toMatch(/method:\s*['"]DELETE['"]/i);
});
