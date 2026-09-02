import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const rows=fs.readFileSync(path.join(process.cwd(),'src/AgendaRowOpenGuard.tsx'),'utf8');
const experience=fs.readFileSync(path.join(process.cwd(),'src/TaskDetailExperienceGuard.tsx'),'utf8');
const agenda=fs.readFileSync(path.join(process.cwd(),'src/AgendaShell.tsx'),'utf8');

test('agenda clickable rows open the canonical task detail route from the whole row',()=>{
 expect(agenda).toContain('navigate(`/tareas/${encodeURIComponent(id)}`)');
 expect(rows).toContain("'.agenda-table tbody tr.ops-clickable-row'");
 expect(rows).toContain("const INTERACTIVE='input,button,a,select,textarea,label'");
 expect(rows).toContain("target?.closest(INTERACTIVE)");
 expect(rows).toContain("row.addEventListener('click',click)");
 expect(rows).toContain("row.addEventListener('keydown',key)");
 expect(experience).toContain('<AgendaRowOpenGuard/>');
});

test('task clickthrough preserves the existing canonical /tareas/{id} detail contract',()=>{
 expect(experience).toContain("const active=/^\\/tareas\\/[^/]+$/.test(location.pathname)");
 expect(experience).not.toContain('TaskRouteCompatibilityGuard');
 expect(experience).not.toContain('TaskDetailShell');
 expect(rows).not.toContain('/agenda/tarea/');
});
