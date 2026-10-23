import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROJECT_REF='hnqlnvakzaywtafeiybt';
const UPSTREAM=`https://${PROJECT_REF}.supabase.co/functions/v1/cerebro-browser-interactive-v3`;
const ALLOWED_ORIGINS=new Set(['https://carlosjmunoz78.github.io','http://localhost:5173','http://127.0.0.1:5173']);
const OWNER_ROUTES=new Set(['owner/companies','owner/status','owner/start','owner/key','owner/takeover','owner/handback','owner/input','owner/stop']);

function cors(origin:string|null){const h:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'origin','x-cerebro-browser-gateway':'v1-preprod'};if(origin&&ALLOWED_ORIGINS.has(origin))h['access-control-allow-origin']=origin;return h;}
function json(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get('origin'))});}
function routeOf(req:Request){const parts=new URL(req.url).pathname.split('/').filter(Boolean);const marker=parts.lastIndexOf('cerebro-browser-gateway-v1');const suffix=marker>=0?parts.slice(marker+1):parts.slice(-2);return suffix.join('/');}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS'){
  if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{...cors(origin),'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type,apikey','access-control-max-age':'600'}});
 }
 const route=routeOf(req);
 if(req.method==='GET'&&route==='health')return json(req,200,{ok:true,service:'cerebro-browser-gateway-v1',environment:'PREPROD',upstream:'cerebro-browser-interactive-v3',owner_routes:[...OWNER_ROUTES],worker_routes_exposed:false,direct_browser_runtime_access:false,prod_write_authorized:false,trading_access:false,incremental_cost_eur:0});
 if(req.method!=='POST'||!OWNER_ROUTES.has(route))return json(req,404,{ok:false,error:'GATEWAY_ROUTE_NOT_AVAILABLE'});
 const authorization=req.headers.get('authorization')??'';
 const apikey=req.headers.get('apikey')??'';
 if(!authorization.toLowerCase().startsWith('bearer ')||!apikey)return json(req,401,{ok:false,error:'OWNER_AUTH_REQUIRED'});
 let body='{}';try{body=await req.text();if(!body.trim())body='{}';JSON.parse(body);}catch{return json(req,400,{ok:false,error:'INVALID_JSON'});}
 const upstream=await fetch(`${UPSTREAM}/${route}`,{method:'POST',headers:{authorization,apikey,'content-type':'application/json'},body,redirect:'error'});
 const raw=await upstream.arrayBuffer();
 const headers=new Headers(upstream.headers);
 for(const name of ['content-length','content-encoding','etag','content-md5','access-control-allow-origin'])headers.delete(name);
 const local=cors(origin);for(const [k,v] of Object.entries(local))headers.set(k,v);
 headers.set('x-cerebro-browser-upstream','cerebro-browser-interactive-v3');
 return new Response(raw,{status:upstream.status,headers});
});
