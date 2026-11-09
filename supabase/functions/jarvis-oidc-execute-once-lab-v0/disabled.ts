import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Security close-out for the completed one-time laboratory task.
// No JWT reading, database access, secrets, GitHub calls or business operations.
Deno.serve((_req:Request)=>new Response(
  JSON.stringify({status:"DISABLED",reason:"ONE_SHOT_COMPLETED"}),
  {status:403,headers:{"content-type":"application/json; charset=utf-8",
    "cache-control":"no-store","x-content-type-options":"nosniff"}}
));
