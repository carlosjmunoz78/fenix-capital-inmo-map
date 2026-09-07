import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('generic contrato plus person is treated as employment contract',()=>{
 const ui=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(ui).toContain("function fileRule(name:string,people:Person[])");
 expect(ui).toContain("person&&/\\bcontrato\\b/i.test(n)");
 expect(ui).toContain("type:'Contrato laboral',family:'employment_contract'");
 expect(ui).toContain("fileRule(file.name,people)");
 expect(ui).toContain('Contrato Ezequiel.pdf');
});

test('generic contrato rule does not steal property/rental contracts',()=>{
 const ui=fs.readFileSync('src/ContextEvidenceUpload.tsx','utf8');
 expect(ui).toContain("!/(arras|compraventa|reserva|alquiler|arrendamiento)/i.test(n)");
});
