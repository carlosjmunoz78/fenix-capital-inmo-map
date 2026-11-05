/**
 * JARVIS B5 VOICE-001 V2 · isolated HTTP protocol candidate.
 * Not an installed Edge Function. Must be mounted behind existing Gateway in
 * LAB only, with B2/B3 server adapters, verified quota and private audio store.
 * Never accepts owner identity, permissions, environment or voiceId from client.
 */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(status,body,origin)=>new Response(JSON.stringify(body),{status,
 headers:{...JSON_HEADERS,'access-control-allow-origin':origin,'vary':'Origin'}});
export function createJarvisB5V2VoiceHttpLab({voicePort,allowedOrigins}={}){
 if(typeof voicePort?.synthesize!=='function'||typeof voicePort?.getAudio!=='function'||
    !Array.isArray(allowedOrigins)||allowedOrigins.length===0||
    allowedOrigins.some(x=>typeof x!=='string'||!x.startsWith('https://')||
     new URL(x).origin!==x))throw Error('TRUSTED_LAB_HTTP_CONFIG_REQUIRED');
 const allowed=new Set(allowedOrigins);
 return Object.freeze({async handle(request){
  if(!(request instanceof Request))throw TypeError('REQUEST_REQUIRED');
  const origin=request.headers.get('origin');
  if(!origin||!allowed.has(origin))return new Response('Forbidden',{status:403,
    headers:{'cache-control':'private, no-store'}});
  const responseHeaders={'access-control-allow-origin':origin,
    'access-control-allow-methods':'POST, OPTIONS',
    'access-control-allow-headers':'authorization, content-type',
    'cache-control':'private, no-store','vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:responseHeaders});
  if(request.method!=='POST')return json(405,{state:'DENY',reason:'METHOD_NOT_ALLOWED'},origin);
  const path=new URL(request.url).pathname;
  if(!path.endsWith('/voice/v2/synthesize')&&!path.endsWith('/voice/v2/audio'))
   return json(404,{state:'DENY',reason:'ROUTE_NOT_FOUND'},origin);
  const auth=request.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+$/.test(auth))return json(401,{state:'DENY',reason:'AUTH_REQUIRED'},origin);
  const contentType=request.headers.get('content-type')||'';
  if(!/^application\/json(?:\s*;|$)/i.test(contentType))return json(415,{state:'DENY',reason:'JSON_REQUIRED'},origin);
  const len=Number(request.headers.get('content-length')||0);
  if(len>2500)return json(413,{state:'DENY',reason:'PAYLOAD_TOO_LARGE'},origin);
  let data;
  try{const raw=await request.text();if(raw.length>2500)throw Error('TOO_LARGE');data=JSON.parse(raw)}
  catch{return json(400,{state:'DENY',reason:'INVALID_JSON_OR_TOO_LARGE'},origin)}
  if(!data||typeof data!=='object'||Array.isArray(data)||
   'environment' in data||'roles' in data||'ownerId' in data||
   'voiceId' in data||'allowPaid' in data||'apiKey' in data)
   return json(400,{state:'DENY',reason:'CLIENT_PRIVILEGE_CLAIMS_FORBIDDEN'},origin);
  const common={token:auth.replace(/^Bearer\s+/,''),
   companyId:data.companyId,sessionId:data.sessionId,requestId:data.requestId,
   consentRef:data.consentRef,environment:'LAB',channel:'CEREBRO_CONSOLE'};
  try{
   if(path.endsWith('/voice/v2/synthesize')){
    const result=await voicePort.synthesize({...common,text:data.text,
     profileId:'JARVIS_V2_CLARA_ES_ES'});
    return json(result.state==='AUDIO_READY'?200:403,result,origin);
   }
   const result=await voicePort.getAudio({...common,audioRef:data.audioRef});
   if(result?.state!=='AUDIO_BYTES_AUTHORIZED')return json(403,
    {state:'DENY',reason:'AUDIO_NOT_AUTHORIZED'},origin);
   if(!(result.bytes instanceof Uint8Array)||result.contentType!=='audio/mpeg')
    return json(503,{state:'DENY',reason:'AUDIO_INVALID'},origin);
   return new Response(result.bytes,{status:200,headers:{...responseHeaders,
    'content-type':'audio/mpeg','x-content-type-options':'nosniff'}});
  }catch{return json(503,{state:'DENY',reason:'VOICE_SERVICE_UNAVAILABLE'},origin)}
 }});
}
