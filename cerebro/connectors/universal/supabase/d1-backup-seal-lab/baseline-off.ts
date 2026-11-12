Deno.serve(()=>new Response(JSON.stringify({status:'DISABLED_LAB_BASELINE'}),{status:404,headers:{'content-type':'application/json','cache-control':'no-store'}}));
