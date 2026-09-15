import fs from 'node:fs';

const files = [
  'tests/visual-agenda.spec.ts',
  'tests/visual-banco-detail.spec.ts',
  'tests/visual-direction.spec.ts',
  'tests/visual-expediente-detail.spec.ts',
  'tests/visual-expedientes.spec.ts',
  'tests/visual-informes.spec.ts',
  'tests/visual-profile.spec.ts',
  'tests/fixed-shell-layout.spec.ts',
  'tests/navigation-responsive-widths.spec.ts'
];

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replaceAll('fenix-preprod-auth', 'fenix-prod-auth-v1')
    .replace(/\/functions\/v1\/([a-z0-9-]+)-test/g, '/functions/v1/$1');

  if (after === before) {
    console.warn(`[prepare-prod-visual-test-runtime] no compatibility rewrite needed: ${file}`);
  }
  fs.writeFileSync(file, after);
}

console.log(JSON.stringify({
  ok: true,
  mode: 'ci_only_test_harness_rewrite',
  production_source_modified: false,
  files: files.length,
  auth_storage_key: 'fenix-prod-auth-v1',
  function_suffix: 'none'
}));
