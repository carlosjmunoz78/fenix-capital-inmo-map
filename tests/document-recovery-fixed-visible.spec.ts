import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('historical document recovery control is mounted directly for document routes',()=>{
  const guard=fs.readFileSync(path.join(process.cwd(),'src/HistoricalDocumentRecoveryFixedGuard.tsx'),'utf8');
  const wrapper=fs.readFileSync(path.join(process.cwd(),'src/IntelligentDocumentIngestionGuard.tsx'),'utf8');
  expect(guard).toContain("location.pathname.match(/^\\/documentos\\/([^/]+)$/)");
  expect(guard).toContain('data-testid="historical-document-recovery-fixed"');
  expect(guard).toContain("z-index:6900");
  expect(guard).toContain('Releer original existente');
  expect(guard).toContain('Documento CADUCADO');
  expect(wrapper).toContain("HistoricalDocumentRecoveryFixedGuard");
  expect(wrapper).not.toContain("HistoricalDocumentRecoveryPlacementFix");
});
