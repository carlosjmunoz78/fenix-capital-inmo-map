/** ZEUS/JARVIS additive gateway deployment guard. Off by default; no side effects in PROD. */
const reply=(status,reason)=>new Response(JSON.stringify({status:'DENIED',reason}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const validOrigin=(v)=>{try{const u=new URL(v);return (u.protocol==='https:'||u.hostname==='localhost'&&u.protocol==='http:')&&u.origin===v&&!u.username&&!u.password;}catch{return false;}};
export function createJarvisGatewaySecurityGate({handler,enabled=false,allowedOrigins=[],rateLimiter=null,allowedHosts=[]}={}){
 if(typeof handler!=='function')throw new TypeError('HANDLER_REQUIRED');
 if(typeof enabled!=='boolean'||!Array.isArray(allowedOrigins)||!Array.isArray(allowedHosts))throw new TypeError('SECURITY_CONFIG_INVALID');
 if(enabled&&(!allowedOrigins.length||!allowedHosts.length||typeof rateLimiter!=='function'))throw new TypeError('SECURITY_GATE_INCOMPLETE');
 if(allowedOrigins.some(o=>typeof o!=='string'||!validOrigin(o)))throw new TypeError('ORIGIN_INVALID');
 if(allowedHosts.some(h=>typeof h!=='string'||!validOrigin(h)))throw new TypeError('HOST_INVALID');
 const originSet=new Set(allowedOrigins),hostSet=new Set(allowedHosts);
 // Preserve platform-provided env and ctx to the authenticated downstream
 // handler; never derive trusted ctx.access from headers, bodies or query.
 return async function gated(request,env,ctx){
  if(!(request instanceof Request))return reply(400,'REQUEST_INVALID');
  if(!enabled)return reply(503,'JARVIS_GATEWAY_DISABLED');
  let uri;try{uri=new URL(request.url);}catch{return reply(400,'URL_INVALID');}
  if(!hostSet.has(uri.origin))return reply(403,'HOST_DENIED');
  const origin=request.headers.get('origin');
  if(origin!==null&&!originSet.has(origin))return reply(403,'ORIGIN_DENIED');
  if(request.method!=='GET'&&request.method!=='POST')return reply(405,'METHOD_DENIED');
  // The limiter must be backed by shared/durable state for production and fail closed on error.
  let permitted=false;
  try{permitted=await rateLimiter({method:request.method,path:uri.pathname,origin:origin??null})===true;}catch{return reply(503,'RATE_LIMIT_UNAVAILABLE');}
  if(!permitted)return reply(429,'RATE_LIMIT_EXCEEDED');
  return handler(request,env,ctx);
 };
}
