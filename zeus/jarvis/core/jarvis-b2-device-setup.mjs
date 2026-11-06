/**
 * CUT32.1 · mobile-friendly B2 device enrollment page, LAB and Access only.
 * No cookie, identity or secret is embedded in client-side code.
 * Owner tap -> same-origin POST -> verification; B3/Gateway remain OFF.
 */
const ORIGIN='https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev';
const PAGE='/__jarvis/b2-device-setup',SCRIPT='/__jarvis/b2-device-setup.js';
const AUD=/^[A-Za-z0-9_-]{15,128}$/;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,150}\.[^\s@]{2,24}$/;
const common={
 'cache-control':'no-store','x-content-type-options':'nosniff',
 'x-frame-options':'DENY','referrer-policy':'no-referrer',
 'content-security-policy':"default-src 'none'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};
const error=(status,msg)=>new Response(JSON.stringify({status:'DENIED',reason:msg}),{
 status,headers:{...common,'content-type':'application/json; charset=utf-8'}
});

const html="<!doctype html>\n<html lang=\"es\"><head><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>JARVIS LAB · Inscribir dispositivo</title></head><body>\n<main><h1>JARVIS LAB</h1>\n<p>Registro temporal y seguro de este dispositivo. No concede acceso a misiones.</p>\n<button id=\"enroll\" type=\"button\">Autorizar este dispositivo</button>\n<p id=\"message\" role=\"status\" aria-live=\"polite\">Inscripción pendiente.</p></main>\n<script defer src=\"/__jarvis/b2-device-setup.js\"></script></body></html>";
const script="'use strict';\nconst button=document.getElementById('enroll');\nconst message=document.getElementById('message');\nbutton.addEventListener('click',async()=>{\n button.disabled=true;\n message.textContent='Comprobando el registro…';\n try {\n  const response=await fetch('/__jarvis/b2-device-enroll',{\n   method:'POST',credentials:'same-origin',cache:'no-store',\n   headers:{'x-jarvis-enrollment':'1'}\n  });\n  if(response.status===201){\n   const check=await fetch('/__jarvis/b2-device-status',{\n    credentials:'same-origin',cache:'no-store'\n   });\n   message.textContent=check.status===200?\n    'Este dispositivo está registrado y su sesión se ha verificado.':\n    'El registro se ha aceptado, pero la sesión aún no está verificada.';\n  } else message.textContent='No se ha registrado este dispositivo. Estado: '+response.status;\n }catch {\n  message.textContent='No hay conexión segura disponible. No se ha confirmado el registro.';\n }finally{button.disabled=false;}\n});";

export function createJarvisB2DeviceSetup({enabled=false,environment='LAB',
 clock=()=>Date.now()}={}){
 if(typeof enabled!=='boolean')throw TypeError('B2_SETUP_BOOLEAN_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('B2_SETUP_LAB_ONLY');
 if(enabled&&typeof clock!=='function')throw TypeError('B2_SETUP_CLOCK_REQUIRED');
 return Object.freeze({async fetch(request,env,ctx){
  if(!enabled||env?.JARVIS_B2_ENROLLMENT_ENABLED!=='true'||
     env?.JARVIS_ENVIRONMENT!=='LAB'||
     env?.JARVIS_GATEWAY_ENABLED!=='false'||
     env?.JARVIS_B2_B3_LIVE_ENABLED!=='false')return error(503,'ENROLLMENT_OFF');
  if(!(request instanceof Request))return error(400,'INVALID_REQUEST');
  if(request.method!=='GET')return error(405,'METHOD_NOT_ALLOWED');
  let url;
  try{url=new URL(request.url)}catch{return error(400,'INVALID_URL')}
  if(url.origin!==ORIGIN||url.search||url.hash||
    (url.pathname!==PAGE&&url.pathname!==SCRIPT))return error(404,'NOT_FOUND');
  let now;try{now=clock()}catch{return error(503,'CLOCK_UNAVAILABLE')}
  const until=Number(env?.JARVIS_B2_ENROLLMENT_UNTIL_MS);
  if(!Number.isSafeInteger(now)||now<=0||!Number.isSafeInteger(until)||
     until<now||until>now+600_000)return error(403,'WINDOW_CLOSED');
  const email=env?.JARVIS_OWNER_EMAIL,aud=env?.JARVIS_ACCESS_AUD;
  if(typeof email!=='string'||!EMAIL.test(email)||email!==email.toLowerCase()||
    typeof aud!=='string'||!AUD.test(aud))return error(503,'OWNER_CONFIG_REQUIRED');
  if(!ctx?.access||ctx.access.aud!==aud||
    typeof ctx.access.getIdentity!=='function')return error(403,'ACCESS_REQUIRED');
  let identity;
  try{identity=await ctx.access.getIdentity()}catch{return error(403,'ACCESS_REQUIRED')}
  if(typeof identity?.email!=='string'||identity.email.toLowerCase()!==email)
   return error(403,'OWNER_NOT_VERIFIED');
  const type=url.pathname===PAGE?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
  return new Response(url.pathname===PAGE?html:script,{
   status:200,headers:{...common,'content-type':type}
  });
 }});
}
