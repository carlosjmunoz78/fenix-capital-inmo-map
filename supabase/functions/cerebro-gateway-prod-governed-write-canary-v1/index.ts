import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async(req:Request)=>{
  if(req.method==="GET"){
    return new Response(JSON.stringify({
      status:"CLOSED_AFTER_GREEN_CANARY",
      service:"cerebro-gateway-prod-governed-write-canary-v1",
      trigger_enabled:false,
      final_status:"GREEN_PHYSICAL_PROD_GOVERNED_WRITE_E2E",
      workflow_run_id:38828722403,
      physical_commit_sha:"f8b56e286fa9e6e8add4089b3d1f0a4146da9aeb",
      rollback_verified:true,
      direct_main_write:false,
      merge:false,
      customer_data:false,
      trading:false,
      additional_cost_eur:0
    }),{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
  }
  return new Response(JSON.stringify({ok:false,status:"CLOSED_AFTER_GREEN_CANARY",error:"CANARY_TRIGGER_DISABLED"}),{status:410,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
});
