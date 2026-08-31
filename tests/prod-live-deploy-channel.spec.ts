import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PRE-PROD no puede volver a sobrescribir el canal live gh-pages',()=>{
  const preprod=fs.readFileSync('.github/workflows/preprod-build.yml','utf8');
  expect(preprod).toContain('preprod-pages');
  expect(preprod).not.toContain('git push --force origin gh-pages');
});

test('main publica un snapshot PROD explícito al canal live gh-pages',()=>{
  const prod=fs.readFileSync('.github/workflows/prod-live-deploy.yml','utf8');
  expect(prod).toContain('branches:\n      - main');
  expect(prod).toContain('VITE_FENIX_ENV: prod');
  expect(prod).toContain('https://cluhljgonannaafpmblx.supabase.co');
  expect(prod).toContain("! grep -R -F 'hnqlnvakzaywtafeiybt.supabase.co' dist-live");
  expect(prod).toContain('git push --force origin gh-pages');
  expect(prod).toContain('PROD_SOURCE_SHA.txt');
});
