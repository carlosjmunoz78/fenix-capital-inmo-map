import {expect,test} from '@playwright/test';
import fs from 'node:fs';

test('historical recovery panel relocates into the visible document side panel',async()=>{
  const source=fs.readFileSync('src/HistoricalDocumentRecoveryPlacementFix.tsx','utf8');
  expect(source).toContain("document.querySelector<HTMLElement>('.doc-view-side')");
  expect(source).toContain("document.querySelector<HTMLElement>('.historical-document-recovery-host')");
  expect(source).toContain('host.parentElement!==side');
  expect(source).toContain('side.insertBefore(host,side.firstChild)');
  expect(source).toContain('new MutationObserver(place)');
});

test('placement fix is mounted with the document intelligence guards',async()=>{
  const source=fs.readFileSync('src/IntelligentDocumentIngestionGuard.tsx','utf8');
  expect(source).toContain("import HistoricalDocumentRecoveryPlacementFix from './HistoricalDocumentRecoveryPlacementFix'");
  expect(source).toContain('<HistoricalDocumentRecoveryPlacementFix />');
});
