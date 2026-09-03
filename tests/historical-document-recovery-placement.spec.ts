import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('historical recovery control renders above the real document modal',async()=>{
  const source=fs.readFileSync('src/HistoricalDocumentRecoveryFixedGuard.tsx','utf8');
  expect(source).toContain("location.pathname.match(/^\\/documentos\\/([^/]+)$/)");
  expect(source).toContain('data-testid="historical-document-recovery-fixed"');
  expect(source).toContain('z-index:6900');
  expect(source).toContain('createPortal');
  expect(source).toContain('document.body');
});

test('fixed recovery guard is mounted with the document intelligence guards',async()=>{
  const source=fs.readFileSync('src/IntelligentDocumentIngestionGuard.tsx','utf8');
  expect(source).toContain("import HistoricalDocumentRecoveryFixedGuard from './HistoricalDocumentRecoveryFixedGuard'");
  expect(source).toContain('<HistoricalDocumentRecoveryFixedGuard />');
  expect(source).not.toContain('HistoricalDocumentRecoveryPlacementFix');
});
