import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('FinOps read cache is scoped to hot read-only endpoints',()=>{
  const source=fs.readFileSync('src/supabase.ts','utf8');
  expect(source).toContain('edgeReadInflight');
  expect(source).toContain('window.sessionStorage');
  expect(source).toContain("path==='/capabilities'");
  expect(source).toContain("path.startsWith('/rules')");
  expect(source).toContain("'fenix-direction-kpis'");
  expect(source).toContain("baseFunctionName==='fenix-notion-runtime'");
  expect(source).toContain('300_000');
  expect(source).toContain('30_000');
  expect(source).toContain("if(method!=='GET')");
});

test('FinOps read cache does not wrap evidence or mutation helpers',()=>{
  const source=fs.readFileSync('src/supabase.ts','utf8');
  const evidence=source.match(/export async function fetchEvidenceApi[\s\S]*?\n}/)?.[0]||'';
  const memory=source.match(/export async function fetchMemoryApi[\s\S]*?\n}/)?.[0]||'';
  expect(evidence).toContain("authenticatedEdgeFetch<T>('fenix-evidence-api'");
  expect(memory).toContain("authenticatedEdgeFetch<T>('fenix-memory-api'");
  expect(evidence).not.toContain('cachedAuthenticatedEdgeFetch');
  expect(memory).not.toContain('cachedAuthenticatedEdgeFetch');
});
