/** SEO-001 · Private/offline WordPress bridge guard patch generator.
 * Does not deploy, write PROD or call STAGING; emits patched private candidate only.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const deny=s=>{throw Error('SEO_STAGING_BRIDGE_'+s)};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const option='fenix_seo_cerebro_staging_release_explicitly_enabled_v1';
const fn='fenix_seo_cerebro_owner_staging_channel_enabled';
const pairs=[
 ["function fenix_seo_cerebro_is_prod(): bool {\n    return fenix_seo_cerebro_host() === 'fenixcapital.es';\n}",
  "function fenix_seo_cerebro_is_prod(): bool {\n    return fenix_seo_cerebro_host() === 'fenixcapital.es';\n}\n/** Default OFF until new owner order. */\nfunction "+fn+"(): bool {\n    return get_option('"+option+"', 'off') === 'on';\n}"],
 ["function fenix_seo_cerebro_inject_update($transient) {\n    if (!fenix_seo_cerebro_is_prod() || !is_object($transient)) return $transient;",
  "function fenix_seo_cerebro_inject_update($transient) {\n    if (!fenix_seo_cerebro_is_prod() || !is_object($transient)) return $transient;\n    if (!"+fn+"()) return $transient;"],
 ["    if ($plugin !== plugin_basename(__FILE__)) return $reply;\n    $transient = get_site_transient('update_plugins');",
  "    if ($plugin !== plugin_basename(__FILE__)) return $reply;\n    if (!"+fn+"()) return new WP_Error('seo_staging_suspended', 'SEO staging release disabled by owner policy.');\n    $transient = get_site_transient('update_plugins');"],
 ["    if (($item->plugin ?? '') !== plugin_basename(__FILE__)) return $update;\n    $package = (string) ($item->package ?? '');",
  "    if (($item->plugin ?? '') !== plugin_basename(__FILE__)) return $update;\n    if (!"+fn+"()) return false;\n    $package = (string) ($item->package ?? '');"]
];
export function prepareStagingBridgeOwnerOffPatch(source){
 if(typeof source!=='string'||source.length<500||source.length>100000)deny('INVALID_INPUT');
 if(!source.includes("const FENIX_SEO_CEREBRO_VERSION = '0.4.1';")||
  !source.includes("const FENIX_SEO_CEREBRO_RELEASE_HOST = 'staging.fenixcapital.es';"))deny('SOURCE_VERSION_DRIFT');
 if(source.includes(fn))deny('ALREADY_PATCHED');
 let candidate=source;
 for(const [from,to] of pairs){
  if(candidate.split(from).length!==2)deny('ANCHOR_DRIFT');
  candidate=candidate.replace(from,to);
 }
 let inverse=candidate;
 for(const [from,to] of [...pairs].reverse()){
  if(inverse.split(to).length!==2)deny('REVERSE_DRIFT');
  inverse=inverse.replace(to,from);
 }
 if(inverse!==source)deny('UNRELATED_BYTES_CHANGED');
 return {candidate,receipt:{
  state:'PREPARED_PRIVATE_NOT_DEPLOYED',company_id:'fenix',engine_id:'SEO-001',
  source_sha256:hash(source),candidate_sha256:hash(candidate),anchors_patched:4,
  owner_option:option,default_off:true,production_changes:0,staging_calls:0,
  backup_and_restore_verified:false,publish_authorized:false,site_update_authorized:false
 }};
}
function localCli(){
 if(process.env.CI==='true'||process.env.GITHUB_ACTIONS==='true')deny('CI_FORBIDDEN');
 const root=process.env.CEREBRO_PRIVATE_BACKUP_ROOT||'',argv=process.argv.slice(2);
 if(!path.isAbsolute(root)||!fs.existsSync(root)||fs.lstatSync(root).isSymbolicLink())deny('PRIVATE_ROOT_REQUIRED');
 const real=fs.realpathSync(root),stat=fs.statSync(real);
 if(!stat.isDirectory()||(stat.mode&0o077)!==0)deny('PRIVATE_ROOT_PERMISSIONS');
 if(argv.length!==2||!argv.every(path.isAbsolute))deny('PRIVATE_PATHS_REQUIRED');
 const src=fs.realpathSync(argv[0]),dest=path.resolve(argv[1]);
 if(!src.startsWith(real+path.sep)||!dest.startsWith(real+path.sep)||
   fs.existsSync(dest)||fs.lstatSync(src).isSymbolicLink()||src===dest)deny('PATH_SCOPE');
 const {candidate,receipt}=prepareStagingBridgeOwnerOffPatch(fs.readFileSync(src,'utf8'));
 fs.writeFileSync(dest,candidate,{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify(receipt)+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{localCli()}catch(e){process.stderr.write(String(e.message).slice(0,170)+'\n');process.exitCode=2}
}
