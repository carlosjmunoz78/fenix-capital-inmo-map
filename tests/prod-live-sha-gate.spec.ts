import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PROD smoke exige que el dominio live sirva exactamente el SHA de main',()=>{
  const workflow=fs.readFileSync('.github/workflows/prod-runtime-smoke.yml','utf8');
  expect(workflow).toContain('APP domain serves this exact main SHA');
  expect(workflow).toContain('${APP_URL}/PROD_SOURCE_SHA.txt?sha=${expected}&attempt=${attempt}');
  expect(workflow).toContain('expected="${GITHUB_SHA}"');
  expect(workflow).toContain('if [ "$live" = "$expected" ]');
  expect(workflow).toContain('Live domain did not converge to expected SHA');
});
