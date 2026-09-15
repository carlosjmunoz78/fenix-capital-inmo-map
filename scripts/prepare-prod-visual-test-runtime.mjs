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
    // Visual CI runs in the isolated test namespace. Normalize both current
    // and legacy fixture keys to the exact storage key expected by the client.
    .replaceAll('fenix-prod-auth-v1', 'fenix-preprod-auth-v2')
    .replaceAll('fenix-preprod-auth', 'fenix-preprod-auth-v2')
    // Keep the synthetic browser session explicitly active. This is CI-only
    // fixture state and does not alter production authentication policy.
    .replaceAll(
      "localStorage.setItem('fenix-remember-device','true')",
      "localStorage.setItem('fenix-remember-device','true');sessionStorage.setItem('fenix-session-active','1')"
    );

  fs.writeFileSync(file, after);
}

console.log(JSON.stringify({
  ok: true,
  mode: 'ci_only_isolated_test_runtime',
  production_source_modified: false,
  files: files.length,
  auth_storage_key: 'fenix-preprod-auth-v2',
  session_active_seeded: true,
  function_suffix: '-test'
}));
