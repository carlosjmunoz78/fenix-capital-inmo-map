import fs from 'node:fs';

const guard=fs.readFileSync('src/ProfileLauncherGuard.tsx','utf8');
const routes=fs.readFileSync('src/RouteAccessGuard.tsx','utf8');
const access=fs.readFileSync('src/cerebroConsoleAccess.ts','utf8');

const checks={
  profile_scoped: guard.includes("location.pathname!=='/perfil'") && guard.includes(".profile-heading"),
  internal_cerebro_navigation: guard.includes("navigate('/cerebro')"),
  launcher_label_present: guard.includes('Abrir CEREBRO'),
  cerebro_route_registered: routes.includes("'/cerebro'"),
  external_console_https_only: access.includes("url.protocol!=='https:'"),
  no_direct_model_reference: !/openai|anthropic|gemini|model\s*api/i.test(guard+access),
};

const ok=Object.values(checks).every(Boolean);
console.log(JSON.stringify({ok,checks},null,2));
if(!ok)process.exit(1);
