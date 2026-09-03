import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('historical document recovery is mounted on the real document detail route',()=>{
  const source=fs.readFileSync('src/HistoricalDocumentRecoveryGuard.tsx','utf8');
  expect(source).toContain('(?:documentos|documentacion)');
  expect(source).toContain("document.querySelector<HTMLElement>('.doc-view-side')||document.querySelector<HTMLElement>('.ops-content')");
  expect(source).toContain('Releer original existente');
});
