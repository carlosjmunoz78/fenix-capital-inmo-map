import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');

test('PROD expediente detail uses canonical runtime and keeps only one topbar',()=>{
 const detail=read('src/DetailShell.tsx');
 expect(detail).toContain("return fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`)");
 expect(detail).not.toContain('className="ops-top detail-exp-top"');
 expect(detail).not.toContain('Ficha PRE-PROD autorizada por rol.');
 expect(detail).toContain('Ficha operativa autorizada por tu rol.');
});

test('legacy expediente codes render participant cards and canonical documents',()=>{
 const detail=read('src/DetailShell.tsx');
 const docs=read('src/ExpedienteDocumentsPanel.tsx');
 expect(detail).toContain('<ExpedientePeoplePanel expedienteId={code}/>');
 expect(detail).toContain('<ExpedienteDocumentsPanel expedienteId={code}/>');
 expect(detail).not.toContain('canonical&&isNotionId(code)&&<ExpedientePeoplePanel');
 expect(docs).toContain("fetchNotionRuntime<Response>('/documentos')");
 expect(docs).toContain('row.scope_code||row.expediente_code');
 expect(docs).toContain('data-testid="expediente-document-count"');
});
