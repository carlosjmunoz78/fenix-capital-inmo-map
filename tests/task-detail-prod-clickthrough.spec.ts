import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const detail=fs.readFileSync(path.join(process.cwd(),'src/TaskDetailShell.tsx'),'utf8');
const route=fs.readFileSync(path.join(process.cwd(),'src/TaskRouteCompatibilityGuard.tsx'),'utf8');
const rows=fs.readFileSync(path.join(process.cwd(),'src/AgendaRowOpenGuard.tsx'),'utf8');
const experience=fs.readFileSync(path.join(process.cwd(),'src/TaskDetailExperienceGuard.tsx'),'utf8');

test('task detail reads from canonical authorized task list and accepts stable task codes',()=>{
 expect(detail).toContain("fetchNotionRuntime<unknown>('/tareas')");
 expect(detail).toContain("['id','tarea_id','tarea_code','code']");
 expect(detail).toContain("find(item=>idOf(item)===id)");
 expect(detail).not.toContain('fenix-notion-actions-test');
});

test('legacy task links redirect to safe agenda task detail route',()=>{
 expect(route).toContain("location.pathname.match(/^\\/tareas\\/([^/]+)$/)");
 expect(route).toContain('navigate(`/agenda/tarea/${match[1]}`');
 expect(experience).toContain('<TaskRouteCompatibilityGuard/>');
 expect(experience).toContain('<TaskDetailShell/>');
});

test('agenda clickable rows open from the whole row but preserve interactive controls',()=>{
 expect(rows).toContain("'.agenda-table tbody tr.ops-clickable-row'");
 expect(rows).toContain("const INTERACTIVE='input,button,a,select,textarea,label'");
 expect(rows).toContain("target?.closest(INTERACTIVE)");
 expect(rows).toContain("row.addEventListener('click',click)");
 expect(rows).toContain("row.addEventListener('keydown',key)");
 expect(experience).toContain('<AgendaRowOpenGuard/>');
});
