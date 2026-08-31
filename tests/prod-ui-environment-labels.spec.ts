import {test,expect} from '@playwright/test';
import fs from 'node:fs';

for(const file of ['src/FinancierosShell.tsx','src/VisitadoresShell.tsx']){
  test(`${file} no expone etiqueta PRE-PROD como estado runtime`,()=>{
    const source=fs.readFileSync(file,'utf8');
    expect(source).not.toContain("?'PRE-PROD'");
    expect(source).not.toContain(":'PRE-PROD'");
    expect(source).toContain("'No disponible'");
  });
}
