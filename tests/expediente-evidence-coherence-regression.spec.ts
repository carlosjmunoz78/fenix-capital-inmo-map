import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

test('expediente keeps a single canonical documents panel',()=>{
 const main=read('src/main.tsx');
 const detail=read('src/DetailShell.tsx');
 expect(main).not.toContain("import ExpedienteDocumentsGuard from './ExpedienteDocumentsGuard'");
 expect(main).not.toContain('<ExpedienteDocumentsGuard />');
 expect(detail).toContain('<ExpedienteDocumentsPanel expedienteId={code}/>');
});

test('canonical document panel surfaces analysis state without replacing stored state',()=>{
 const panel=read('src/ExpedienteDocumentsPanel.tsx');
 expect(panel).toContain('row.analysis_state');
 expect(panel).toContain("show(row.estado)");
 expect(panel).toContain("analysis?` · ${analysis}`:''");
});

test('legacy expediente documents match canonical scope_code before legacy relations',()=>{
 const panel=read('src/ExpedienteDocumentsPanel.tsx');
 expect(panel).toContain("row.scope_code||row.expediente_code");
 expect(panel).toContain('if(scope===code)return true');
});
