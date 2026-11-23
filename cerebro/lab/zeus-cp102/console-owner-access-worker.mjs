// CEREBRO Console → ZEUS live owner-only LAB viewer.
// Dedicated Worker protected by an owner-only Cloudflare Access self-hosted app.
// Data source: existing D1 binding, SELECT statements only. No mutations or console actions.
const CERTS_PATH='/cdn-cgi/access/certs';
const MAX_JWT_LENGTH=12000;
let keysCache=null,keysUntil=0,inflight=null;
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
 'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
}});
const htmlEscape=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function bytes(value) {
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('TOKEN_FORMAT');
 let raw=value.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(raw.padEnd(Math.ceil(raw.length/4)*4,'=')),c=>c.charCodeAt(0));
}
function tokenPart(segment) {
 try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes(segment)));}
 catch{throw Error('TOKEN_FORMAT');}
}
async function loadAccessKeys(issuer,kid) {
 const now=Date.now();
 if(keysCache&&now<keysUntil&&keysCache.some(k=>k.kid===kid))return keysCache;
 if(!inflight)inflight=(async()=>{
  let response;
  try{response=await fetch(issuer+CERTS_PATH,{method:'GET',redirect:'manual',
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});}
  catch{throw Error('CERT_FETCH');}
  if(!response.ok||response.redirected)throw Error('CERT_FETCH');
  if(Number(response.headers.get('content-length')||0)>65536)throw Error('CERT_TOO_LARGE');
  const raw=await response.text();
  if(new TextEncoder().encode(raw).length>65536)throw Error('CERT_TOO_LARGE');
  let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('CERT_FORMAT');}
  const keys=parsed.keys;
  if(!Array.isArray(keys)||!keys.length||keys.length>32)throw Error('CERT_FORMAT');
  const selected=keys.filter(k=>k&&k.kty==='RSA'&&typeof k.kid==='string'&&
    /^[A-Za-z0-9_-]{1,128}$/.test(k.kid)&&typeof k.n==='string'&&typeof k.e==='string'&&
    (!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
  if(!selected.length||new Set(selected.map(k=>k.kid)).size!==selected.length)throw Error('CERT_FORMAT');
  keysCache=selected;keysUntil=Date.now()+60000;
  return selected;
 })().finally(()=>{inflight=null;});
 return inflight;
}
async function authorize(request,env) {
 const header=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!header||header.length>MAX_JWT_LENGTH||header.split('.').length!==3)throw Error('ACCESS_REQUIRED');
 if(!env.ACCESS_AUD||!env.ACCESS_ISSUER||!env.ACCESS_OWNER_EMAIL)throw Error('ACCESS_CONFIG');
 const [h,p,s]=header.split('.');
 const head=tokenPart(h),claims=tokenPart(p);
 if(head.alg!=='RS256'||typeof head.kid!=='string'||!(/^[A-Za-z0-9_-]{1,128}$/.test(head.kid)))throw Error('ACCESS_ALG');
 if(claims.iss!==env.ACCESS_ISSUER||!Array.isArray(claims.aud)||!claims.aud.includes(env.ACCESS_AUD))throw Error('ACCESS_SCOPE');
 if(typeof claims.email!=='string'||claims.email.toLowerCase()!==env.ACCESS_OWNER_EMAIL.toLowerCase())throw Error('ACCESS_OWNER');
 const now=Math.floor(Date.now()/1000);
 if(!Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||claims.exp<=now||
   claims.iat>now+30||claims.exp-claims.iat>86400||
   (claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30)))throw Error('ACCESS_EXPIRED');
 const keys=await loadAccessKeys(env.ACCESS_ISSUER,head.kid);
 const candidates=keys.filter(k=>k.kid===head.kid);
 if(candidates.length!==1)throw Error('ACCESS_KID');
 let key;try{key=await crypto.subtle.importKey('jwk',candidates[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);}
 catch{throw Error('ACCESS_KEY');}
 const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(s),new TextEncoder().encode(h+'.'+p));
 if(!ok)throw Error('ACCESS_SIGNATURE');
 return true;
}
const QUERY="SELECT company_id,engine_id,environment,version,evidence_ref,execution_state,health_state,autonomy_state,promotion_allowed,source_sha256 FROM zeus_scoped_observations_v1 WHERE (company_id='fenix-capital' AND engine_id='FACT-001' AND environment='LAB') OR (company_id='fenix' AND engine_id='LRN-001' AND environment='PREPROD') ORDER BY engine_id";
function render(rows,cursor,receiptCount) {
 const result=rows.map(row=>{
  const verified=(row.company_id==='fenix-capital'&&row.engine_id==='FACT-001'&&row.environment==='LAB')||
    (row.company_id==='fenix'&&row.engine_id==='LRN-001'&&row.environment==='PREPROD');
  if(!verified||row.promotion_allowed!==0||!row.evidence_ref||!row.source_sha256)throw Error('EVIDENCE_CONTRACT');
  return '<article class="card"><div class="scope">'+htmlEscape(row.company_id)+' / '+htmlEscape(row.environment)+
   '</div><h2>'+htmlEscape(row.engine_id)+'</h2><p class="state">'+htmlEscape(row.health_state)+'</p>'+
   '<dl><dt>Versión</dt><dd>'+htmlEscape(row.version)+'</dd><dt>Ejecución</dt><dd>'+htmlEscape(row.execution_state)+'</dd>'+
   '<dt>Autonomía</dt><dd>'+htmlEscape(row.autonomy_state)+'</dd><dt>Promoción</dt><dd>NO AUTORIZADA</dd>'+
   '<dt>Evidencia</dt><dd class="evidence">'+htmlEscape(row.evidence_ref)+'</dd></dl></article>';
 }).join('');
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>CEREBRO · ZEUS LAB</title><style>body{font-family:system-ui,sans-serif;background:#0e1625;color:#eef3fb;margin:0}'+
 'main{max-width:1060px;margin:auto;padding:36px 24px}.label{color:#58d5ba;font-weight:bold;letter-spacing:.14em;font-size:12px}'+
 'h1{font-size:36px;margin:6px 0}p{color:#b9c7d9}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:24px}'+
 '.card,.strip{border-radius:14px;background:#18263b;border:1px solid #2a4161;padding:20px}.scope{font-size:12px;color:#a6b8cf}'+
 '.card h2{margin:7px 0}.state{color:#80dcc7;font-weight:bold}.strip{margin-top:18px;color:#f7d9a1}dl{display:grid;grid-template-columns:90px 1fr;gap:8px;font-size:13px}'+
 'dt{color:#a3b5c9}dd{margin:0;overflow-wrap:anywhere}.evidence{font-family:monospace;font-size:11px}footer{margin-top:28px;color:#8299b9;font-size:12px}</style></head><body><main>'+
 '<div class="label">CEREBRO OS · SUPERVISOR ZEUS · LAB</div><h1>Estado operativo verificado</h1>'+
 '<p>Vista de lectura real en D1 · acceso individual por Cloudflare Access · sin control de ejecución.</p>'+
 '<div class="grid">'+result+'</div><div class="strip"><strong>Learning</strong> · cursor diario: '+htmlEscape(cursor)+
 ' · publicaciones acreditadas: '+htmlEscape(receiptCount)+
 '. Ambos motores tienen promotion_allowed = false. Esta vista NO acredita autonomía en PROD.</div>'+
 '<footer>Estado consultado en directo al cargar. Fuente: ZEUS D1 · sin escrituras · distintas identidades: fenix-capital y fenix.</footer></main></body></html>';
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(request.method!=='GET'||!['/','/health'].includes(url.pathname))return new Response(null,{status:404});
  try{await authorize(request,env);}catch{return json({ok:false,error:'ACCESS_DENIED'},403);}
  if(url.pathname==='/health')return json({ok:true,component:'CEREBRO_ZEUS_OWNER_LAB',read_only:true});
  try {
   const [a,b,c]=await Promise.all([
    env.ZEUS_DB.prepare(QUERY).all(),
    env.ZEUS_DB.prepare("SELECT position FROM zeus_lrn_replay_cursor_v1 WHERE id='fenix:LRN-001:PREPROD:daily'").first(),
    env.ZEUS_DB.prepare("SELECT COUNT(*) AS n FROM zeus_lrn_publications_cp106_lab WHERE company_id='fenix' AND engine_id='LRN-001' AND environment='PREPROD'").first()
   ]);
   const rows=a.results||[];
   if(rows.length!==2||!Number.isSafeInteger(b?.position)||!Number.isSafeInteger(c?.n))throw Error('MISSING_EVIDENCE');
   return new Response(render(rows,b.position,c.n),{status:200,headers:{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'private,no-store',
    'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
   }});
  }catch{return json({ok:false,error:'ZEUS_READ_UNAVAILABLE'},503);}
 }
};
