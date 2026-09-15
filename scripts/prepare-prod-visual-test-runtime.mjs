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
    // Rewrite the exact current PRE-PROD auth key first. Replacing the shorter
    // legacy prefix first would corrupt `fenix-preprod-auth-v2` into
    // `fenix-prod-auth-v1-v2` and leave the PROD client unauthenticated.
    .replaceAll('fenix-preprod-auth-v2', 'fenix-prod-auth-v1')
    .replaceAll('fenix-preprod-auth', 'fenix-prod-auth-v1')
    // Keep CI sessions active even for fixtures that do not persist the
    // "remember device" flag exactly as PROD expects. This changes only the
    // test harness, never production source or auth policy.
    .replaceAll(
      "localStorage.setItem('fenix-remember-device','true')",
      "localStorage.setItem('fenix-remember-device','true');sessionStorage.setItem('fenix-session-active','1')"
    )
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
  session_active_seeded: true,
  function_suffix: 'none'
}));
