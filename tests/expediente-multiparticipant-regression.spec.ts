import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function source(rel:string){return fs.readFileSync(path.join(process.cwd(),rel),'utf8');}

test('expediente conserva todos los participantes y su identidad individual',async()=>{
  const panel=source('src/ExpedientePeoplePanel.tsx');
  const runtime=source('src/notionRuntime.ts');
  const detail=source('src/DetailShell.tsx');
  const rename=source('src/ExpedienteRenameGuard.tsx');

  expect(detail).toContain('<ExpedientePeoplePanel expedienteId={code}/>');
  expect(runtime).toContain("const people=pathname.match(/^\\/expedientes\\/([^/]+)\\/compradores$/)");
  expect(runtime).toContain("fetchEnvironmentApi<T>('fenix-expediente-people'");

  expect(panel).toContain('const people=useMemo(()=>data?.items??[],[data])');
  expect(panel).toContain('people.map((p,i)=>');
  expect(panel).toContain('key={p.id}');
  expect(panel).toContain('data-person-id={p.id}');
  expect(panel).toContain('data-testid={`exp-person-${p.id}`}');
  expect(panel).toContain("setEditing(p.id)");
  expect(panel).toContain('updatePerson(id,draft)');
  expect(panel).toContain('comprador=${encodeURIComponent(p.id)}');
  expect(panel).not.toMatch(/data\?\.items\?\.[\s\S]{0,30}\[0\]/);
  expect(panel).not.toMatch(/people\[0\]/);

  expect(rename).toContain('friendlyFromPeople(people)');
  expect(rename).toContain('joinNames(people)');
  expect(rename).not.toMatch(/people\[0\]/);
});

test('contador visible procede del payload multicliente y no de un alias legado',async()=>{
  const panel=source('src/ExpedientePeoplePanel.tsx');
  const rename=source('src/ExpedienteRenameGuard.tsx');

  expect(panel).toContain('data?.count??0');
  expect(panel).toContain('data?.titulares??0');
  expect(panel).toContain('data?.avalistas??0');
  expect(rename).toContain('aliasIsSingleParticipant');
  expect(rename).toContain("people.length>1");
  expect(rename).toContain("setCustomName(current=>aliasIsSingleParticipant(current,rows)?'':current)");
});
