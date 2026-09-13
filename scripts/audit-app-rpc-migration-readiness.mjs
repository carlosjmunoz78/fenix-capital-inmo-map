import fs from 'node:fs';

const requiredCompat = [
  'fenix_prod_chat_list_user',
  'fenix_prod_chat_send_user',
  'fenix_prod_contact_create',
  'fenix_prod_exp_create',
  'fenix_prod_exp_update',
  'fenix_prod_notifications_list_user',
  'fenix_prod_notification_mark_user',
  'fenix_prod_sign_create',
];

const requiredServer = [
  'fenix_prod_chat_list_server',
  'fenix_prod_chat_send_server',
  'fenix_prod_contact_create_server',
  'fenix_prod_exp_create_server',
  'fenix_prod_exp_update_server',
  'fenix_prod_notifications_list_server',
  'fenix_prod_notification_mark_server',
  'fenix_prod_sign_create_server',
];

const requiredRoutes = [
  "p==='/chat'&&req.method==='GET'",
  "p==='/chat'&&req.method==='POST'",
  "p==='/contactos'&&req.method==='POST'",
  "p==='/expedientes'&&req.method==='POST'",
  "s[0]==='expedientes'&&s[1]&&!s[2]&&req.method==='PATCH'",
  "p==='/notificaciones'&&req.method==='GET'",
  "s[0]==='notificaciones'&&s[1]&&s[2]==='state'&&req.method==='POST'",
  "p==='/firmas'&&req.method==='POST'",
];

const compat = fs.readFileSync('src/appRpcCompat.ts', 'utf8');
const gateway = fs.readFileSync('supabase/functions/fenix-app-gateway/index.ts', 'utf8');
const preprodApp = fs.readFileSync('.github/workflows/preprod-build.yml', 'utf8');
const preprodFactory = fs.readFileSync('.github/workflows/cerebro-factory-preprod.yml', 'utf8');

const missingCompat = requiredCompat.filter((x) => !compat.includes(`case '${x}'`));
const missingServer = requiredServer.filter((x) => !gateway.includes(`'${x}'`));
const missingRoutes = requiredRoutes.filter((x) => !gateway.includes(x));

function manualOnly(name, text) {
  const onBlock = text.split(/\npermissions:/)[0];
  const hasDispatch = /\n\s*workflow_dispatch:\s*(?:\n|$)/.test(onBlock);
  const hasAutoTrigger = /\n\s*(push|pull_request|schedule):\s*(?:\n|$)/.test(onBlock);
  return { name, has_dispatch: hasDispatch, has_auto_trigger: hasAutoTrigger, ok: hasDispatch && !hasAutoTrigger };
}

const preprod = [
  manualOnly('PRE-PROD App Build', preprodApp),
  manualOnly('CEREBRO Factory PREPROD', preprodFactory),
];

const dangerousRevokePattern = /REVOKE\s+EXECUTE[\s\S]{0,250}(fenix_prod_chat_list_user|fenix_prod_chat_send_user|fenix_prod_contact_create|fenix_prod_exp_create|fenix_prod_exp_update|fenix_prod_notifications_list_user|fenix_prod_notification_mark_user|fenix_prod_sign_create)/i;
const dangerousRevokePresent = dangerousRevokePattern.test(gateway) || dangerousRevokePattern.test(compat);

const output = {
  schema_version: 1,
  mode: 'READ_ONLY_STATIC_READINESS_AUDIT',
  required_compat_cases: requiredCompat.length,
  required_server_rpcs: requiredServer.length,
  required_gateway_routes: requiredRoutes.length,
  missing_compat_cases: missingCompat,
  missing_server_rpcs: missingServer,
  missing_gateway_routes: missingRoutes,
  preprod_manual_only: preprod,
  dangerous_legacy_execute_revoke_present_in_checked_runtime_files: dangerousRevokePresent,
};

const ok =
  missingCompat.length === 0 &&
  missingServer.length === 0 &&
  missingRoutes.length === 0 &&
  preprod.every((x) => x.ok) &&
  !dangerousRevokePresent;

output.ready_for_controlled_gateway_deploy = ok;
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (!ok) process.exitCode = 3;
