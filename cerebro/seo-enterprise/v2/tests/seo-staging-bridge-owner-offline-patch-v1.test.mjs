import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareStagingBridgeOwnerOffPatch} from '../runtime/seo-staging-bridge-owner-offline-patch-v1.mjs';
const lines=[
"<?php",
"const FENIX_SEO_CEREBRO_VERSION = '0.4.1';",
"const FENIX_SEO_CEREBRO_RELEASE_HOST = 'staging.fenixcapital.es';",
"function fenix_seo_cerebro_is_prod(): bool {",
"    return fenix_seo_cerebro_host() === 'fenixcapital.es';",
"}",
"function fenix_seo_cerebro_inject_update($transient) {",
"    if (!fenix_seo_cerebro_is_prod() || !is_object($transient)) return $transient;",
"    $response = wp_remote_get('https://staging.fenixcapital.es/wp-json/fenix-seo-cerebro/v1/release');",
"    return $transient;",
"}",
"function fenix_seo_cerebro_verify_pre_download($reply, $package, $upgrader, $hookExtra) {",
"    if ($reply !== false || !fenix_seo_cerebro_is_prod()) return $reply;",
"    $plugin = is_array($hookExtra) ? (string) ($hookExtra['plugin'] ?? '') : '';",
"    if ($plugin !== plugin_basename(__FILE__)) return $reply;",
"    $transient = get_site_transient('update_plugins');",
"    $tmp = download_url((string) $package, 30);",
"    return $tmp;",
"}",
"add_filter('auto_update_plugin', static function ($update, $item) {",
"    if (!fenix_seo_cerebro_is_prod() || !is_object($item)) return $update;",
"    if (($item->plugin ?? '') !== plugin_basename(__FILE__)) return $update;",
"    $package = (string) ($item->package ?? '');",
"    return true;",
"}, 10, 2);",
"/* END SYNTHETIC FIXTURE */",
"x".repeat(600)
];
const original=lines.join('\n');
test('known-source deterministic candidate blocks all staging fetch paths by default',()=>{
 const {candidate,receipt}=prepareStagingBridgeOwnerOffPatch(original);
 assert.equal(receipt.anchors_patched,4);assert.equal(receipt.production_changes,0);
 assert.equal(receipt.staging_calls,0);assert.equal(receipt.default_off,true);
 assert.notEqual(receipt.source_sha256,receipt.candidate_sha256);
 assert.ok(candidate.indexOf('if (!fenix_seo_cerebro_owner_staging_channel_enabled()) return $transient;') < candidate.indexOf('wp_remote_get('));
 assert.ok(candidate.indexOf("new WP_Error('seo_staging_suspended'") < candidate.indexOf('download_url('));
 assert.ok(candidate.includes('if (!fenix_seo_cerebro_owner_staging_channel_enabled()) return false;'));
 assert.ok(candidate.includes("get_option('fenix_seo_cerebro_staging_release_explicitly_enabled_v1', 'off') === 'on'"));
});
test('rejects unknown version, a missing hook anchor and double application',()=>{
 const result=prepareStagingBridgeOwnerOffPatch(original);
 assert.throws(()=>prepareStagingBridgeOwnerOffPatch(result.candidate),/ALREADY_PATCHED/);
 assert.throws(()=>prepareStagingBridgeOwnerOffPatch(original.replace("'0.4.1'","'0.9.0'")),/SOURCE_VERSION_DRIFT/);
 assert.throws(()=>prepareStagingBridgeOwnerOffPatch(original.replace("return $transient;","return null;")),/ANCHOR_DRIFT/);
});

test('generator runs only from a private source and never authorizes live update',()=>{
 const p=prepareStagingBridgeOwnerOffPatch(original);
 assert.equal(p.receipt.state,'PREPARED_PRIVATE_NOT_DEPLOYED');
 assert.equal(p.receipt.production_changes,0);
 assert.equal(p.receipt.site_update_authorized,false);
 assert.equal(p.receipt.backup_and_restore_verified,false);
});
