import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/** Owner-enforced PREPROD staging suspension, applied only after backing up
 * the exact original Edge source and version to a restricted private table.
 * NEVER deploy to PROD or use for independent, non-staging workloads.
 * Never reactivate automatically; requires new explicit owner instruction.
 */
Deno.serve((_req: Request) => new Response(JSON.stringify({
 ok: false,
 state: "BLOCKED_DEPENDENCY",
 reason: "STAGING_SUSPENDED_BY_OWNER",
 dependency_id: "wordpress_staging",
 executed: false,
 side_effects: false
}), { status: 423, headers: {
 "content-type": "application/json",
 "cache-control": "no-store",
 "x-cerebro-suspension": "STAGING_SUSPENDED_BY_OWNER"
}}));
