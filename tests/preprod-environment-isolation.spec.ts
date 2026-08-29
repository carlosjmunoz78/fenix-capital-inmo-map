import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir:string):string[]{
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

test('PRE-PROD queda aislada de endpoints Edge sin sufijo -test',()=>{
  const files=walk(path.resolve('src')).filter(file=>/\.(ts|tsx)$/.test(file));
  const violations:{file:string;endpoint:string}[]=[];
  for(const file of files){
    const text=fs.readFileSync(file,'utf8');
    const patterns=[
      /functions\/v1\/(fenix-[a-z0-9-]+)/gi,
      /authenticatedEdgeFetch<[^>]+>\(['"](fenix-[a-z0-9-]+)['"]/gi,
      /authenticatedEdgeFetch\(['"](fenix-[a-z0-9-]+)['"]/gi,
    ];
    for(const pattern of patterns){
      for(const match of text.matchAll(pattern)){
        const endpoint=match[1];
        if(endpoint&&!endpoint.endsWith('-test'))violations.push({file:path.relative(process.cwd(),file),endpoint});
      }
    }
  }
  expect(violations,'PRE-PROD no puede invocar funciones Fénix sin sufijo -test').toEqual([]);
});

test('cliente y almacenamiento de sesión están identificados explícitamente como PRE-PROD',()=>{
  const text=fs.readFileSync(path.resolve('src/supabase.ts'),'utf8');
  expect(text).toContain("const AUTH_STORAGE_KEY='fenix-preprod-auth-v2'");
  expect(text).toContain('fenix-app-gateway-test');
  expect(text).not.toMatch(/functions\/v1\/fenix-app-gateway(?:[/'"`])/);
});

test('workflow PRE-PROD solo publica desde preprod-app-phase1 y no escribe main',()=>{
  const text=fs.readFileSync(path.resolve('.github/workflows/preprod-build.yml'),'utf8');
  expect(text).toContain('name: PRE-PROD App Build');
  expect(text).toContain('- preprod-app-phase1');
  expect(text).toContain("github.ref == 'refs/heads/preprod-app-phase1'");
  expect(text).toContain('git push origin HEAD:preprod-app-phase1');
  expect(text).not.toMatch(/git push[^\n]*\bmain\b/);
  expect(text).not.toMatch(/git push[^\n]*HEAD:main/);
});
