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
  let after = before
    .replaceAll("'fenix-prod-auth-v1'", "'fenix-preprod-auth-v2'")
    .replaceAll('"fenix-prod-auth-v1"', '"fenix-preprod-auth-v2"')
    .replaceAll("'fenix-preprod-auth'", "'fenix-preprod-auth-v2'")
    .replaceAll('"fenix-preprod-auth"', '"fenix-preprod-auth-v2"');

  const activeSingle = "sessionStorage.setItem('fenix-session-active','1')";
  const activeDouble = 'sessionStorage.setItem("fenix-session-active","1")';
  if (!after.includes(activeSingle) && !after.includes(activeDouble)) {
    after = after.replace(
      "localStorage.setItem('fenix-remember-device','true')",
      "localStorage.setItem('fenix-remember-device','true');" + activeSingle
    );
  }

  fs.writeFileSync(file, after);
}

console.log(JSON.stringify({
  ok: true,
  mode: 'ci_only_isolated_test_runtime',
  production_source_modified: false,
  files: files.length,
  auth_storage_key: 'fenix-preprod-auth-v2',
  session_active_seeded: true,
  idempotent: true,
  function_suffix: '-test'
}));
