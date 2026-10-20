#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const DEFAULT_REGISTRY=path.join(ROOT,'registry','p0-operational-capabilities-v1.json');
const DEFAULT_PORTFOLIO=path.join(ROOT,'registry','skill-priority-portfolio-v1.json');
const DEFAULT_ENGINES=path.join(ROOT,'registry','engine-registry.v1.json');
const READONLY_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE']);
const PREPROD_MODES=new Set([...READONLY_MODES,'GENERATE_ARTIFACT','PUBLIC_READ']);
const PROD_STATE='PROD_CAPABILITY_AVAILABLE_READONLY';

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function req(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const s=v.trim();if(s.length>max)throw new Error(`${label} too long`);return s;}
function safeSeg(v,label='segment'){const s=req(v,label,120);if(!/^[A-Za-z0-9._-]+$/.test(s)||s==='.'||s==='..')throw new Error(`${label} unsafe`);return s;}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'});}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');}
function isTrading(id,portfolio){const x=String(id??'');const g=portfolio?.global_language_binding??{};return (g.excluded_engine_ids??[]).includes(x)||(g.excluded_engine_id_prefixes??[]).some((p)=>x.startsWith(p));}
function familyPolicy(portfolio,family){return (portfolio?.portfolio??[]).find((x)=>x.capability_family===family)??null;}
function familyBindings(portfolio,family,engines){const p=familyPolicy(portfolio,family);if(!p)return [];
  if(p.global_cross_cutting===true&&family==='LANGUAGE_HUMAN_INTERACTION')return (engines?.engine_ids??[]).filter((id)=>!isTrading(id,portfolio));
  return [...(p.primary_engine_bindings??[])];
}
function canaryGreen(row){return /^GREEN_[A-Z0-9_]+_PROD_READONLY_CANARY$/.test(String(row?.prod_readonly_canary??''));}

export function buildP0OperationalCatalog({registryFile=DEFAULT_REGISTRY,portfolioFile=DEFAULT_PORTFOLIO,engineRegistryFile=DEFAULT_ENGINES}={}){
  const registry=loadJson(registryFile),portfolio=loadJson(portfolioFile),engines=loadJson(engineRegistryFile);
  const rows=(registry.capabilities??[]).map((row)=>{
    const bindings=familyBindings(portfolio,row.capability_family,engines);
    const evidenceGreen=row.status==='FULL_SAFE_PREPROD'&&row.priority_evidence_status==='PRIORITY_SEMANTIC_EVIDENCE_GREEN'&&row.generated_bindings===row.expected_bindings&&row.generated_bindings>0&&Boolean(row.candidate_id&&row.pinned_sha&&row.snapshot_sha256&&row.manifest_sha256&&row.outcome_hash);
    return Object.freeze({...row,target_engine_bindings:Object.freeze(bindings),full_safe_preprod_evidence_green:evidenceGreen,prod_capability_state:evidenceGreen&&canaryGreen(row)?PROD_STATE:'HOLD_PREPROD_CANARY'});
  });
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_P0_OPERATIONAL_CATALOG_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'MULTI',version:'1.0.0',status:rows.every((r)=>r.full_safe_preprod_evidence_green)?'GREEN_P0_OPERATIONAL_CATALOG':'HOLD_P0_CATALOG',capability_count:rows.length,prod_readonly_count:rows.filter((r)=>r.prod_capability_state===PROD_STATE).length,capabilities:Object.freeze(rows),...authority()});
}

export function resolveP0Capability({technical_name,engine_id,environment='PREPROD',requested_mode='ANALYZE',registryFile=DEFAULT_REGISTRY,portfolioFile=DEFAULT_PORTFOLIO,engineRegistryFile=DEFAULT_ENGINES}={}){
  const catalog=buildP0OperationalCatalog({registryFile,portfolioFile,engineRegistryFile});
  const row=catalog.capabilities.find((x)=>x.technical_name===technical_name);const blockers=[];
  if(!row)blockers.push('CAPABILITY_NOT_FOUND');
  if(row&&!row.full_safe_preprod_evidence_green)blockers.push('FULL_SAFE_PREPROD_EVIDENCE_NOT_GREEN');
  if(row&&!row.target_engine_bindings.includes(engine_id))blockers.push('ENGINE_BINDING_MISMATCH');
  const env=String(environment).toUpperCase();
  if(!['LAB','PREPROD','PROD'].includes(env))blockers.push('ENVIRONMENT_UNSUPPORTED');
  if(env==='PROD'){
    if(!READONLY_MODES.has(requested_mode))blockers.push('PROD_MODE_NOT_READONLY');
    if(row&&row.prod_capability_state!==PROD_STATE)blockers.push('PROD_READONLY_CANARY_NOT_GREEN');
  }else if(!PREPROD_MODES.has(requested_mode))blockers.push('MODE_UNSUPPORTED');
  const allowed=blockers.length===0;
  return Object.freeze({allowed,status:allowed?(env==='PROD'?PROD_STATE:'PREPROD_OPERATIONAL_CAPABILITY_AVAILABLE'):'DENY_P0_CAPABILITY',technical_name:technical_name??null,capability_family:row?.capability_family??null,candidate_id:row?.candidate_id??null,engine_id,environment:env,requested_mode,target_engine_bindings:row?.target_engine_bindings??[],blockers:Object.freeze(blockers),...authority()});
}

function ensureOutputRoot(root){const out=path.resolve(req(root,'output_root'));fs.mkdirSync(out,{recursive:true});const st=fs.lstatSync(out);if(!st.isDirectory()||st.isSymbolicLink())throw new Error('OUTPUT_ROOT_MUST_BE_REAL_DIRECTORY');return out;}
function writeSafe(root,relative,content){const rel=relative.split('/').map((x)=>safeSeg(x,'output path segment')).join(path.sep);const target=path.resolve(root,rel);if(!target.startsWith(`${root}${path.sep}`)&&target!==root)throw new Error('OUTPUT_PATH_ESCAPE');fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw new Error('OUTPUT_SYMLINK_DENIED');fs.writeFileSync(target,content,'utf8');return target;}
function esc(s){return String(s??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

export function createCrossDeviceAppScaffold({name,description='',output_root,features=[],company_id='GLOBAL'}={}){
  const appName=req(name,'name',100);const root=ensureOutputRoot(output_root);const slug=safeSeg(appName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'app','slug');const dir=path.join(root,slug);fs.mkdirSync(dir,{recursive:true});
  const contract={schema_version:'1.0.0',state_type:'CEREBRO_CROSS_DEVICE_APP_SCAFFOLD_V1',company_id,engine_id:'APP-001',environment:'PREPROD',version:'1.0.0',name:appName,description:String(description),features:[...features].map(String),targets:{web:'RUNNABLE_PWA',mobile:'RUNNABLE_PWA_INSTALLABLE',tablet:'RUNNABLE_PWA_INSTALLABLE',desktop:'RUNNABLE_PWA_INSTALLABLE',ios_native:'ADAPTER_REQUIRED_IF_NATIVE_DISTRIBUTION_REQUESTED',android_native:'ADAPTER_REQUIRED_IF_NATIVE_DISTRIBUTION_REQUESTED',desktop_native:'ADAPTER_REQUIRED_IF_NATIVE_DISTRIBUTION_REQUESTED'},security:{no_secrets_embedded:true,prod_deploy_authorized:false},...authority()};
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111"><link rel="manifest" href="manifest.webmanifest"><link rel="stylesheet" href="styles.css"><title>${esc(appName)}</title></head><body><main id="app"><h1>${esc(appName)}</h1><p>${esc(description)}</p><section id="features"></section></main><script type="module" src="app.js"></script></body></html>\n`;
  const js=`const features=${JSON.stringify(contract.features)};document.querySelector('#features').innerHTML=features.length?'<h2>Funciones</h2><ul>'+features.map(x=>'<li>'+String(x).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</li>').join('')+'</ul>':'';if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});\n`;
  const css=`:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}body{margin:0;background:#fff;color:#111}main{max-width:960px;margin:auto;padding:clamp(20px,5vw,64px)}h1{font-size:clamp(2rem,6vw,4rem)}@media(prefers-color-scheme:dark){body{background:#111;color:#f5f5f5}}\n`;
  const manifest={name:appName,short_name:appName.slice(0,24),start_url:'./',display:'standalone',background_color:'#ffffff',theme_color:'#111111'};
  const sw=`const CACHE='cerebro-${hash(contract).slice(0,12)}';const ASSETS=['./','index.html','styles.css','app.js','manifest.webmanifest'];self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));\n`;
  writeSafe(dir,'index.html',html);writeSafe(dir,'app.js',js);writeSafe(dir,'styles.css',css);writeSafe(dir,'manifest.webmanifest',`${JSON.stringify(manifest,null,2)}\n`);writeSafe(dir,'sw.js',sw);writeSafe(dir,'cerebro-app-contract.json',`${JSON.stringify(contract,null,2)}\n`);writeSafe(dir,'README.md',`# ${appName}\n\nScaffold PREPROD generado por CEREBRO APP-001. Núcleo PWA sin dependencias externas. No autoriza despliegue PROD.\n`);
  return Object.freeze({status:'GREEN_CROSS_DEVICE_APP_SCAFFOLD_CREATED',output_dir:dir,file_count:7,contract_hash:hash(contract),contract,...authority()});
}

export function createWebsiteScaffold({name,headline,description='',cta='Contactar',output_root,company_id='GLOBAL'}={}){
  const siteName=req(name,'name',100),h=req(headline,'headline',180);const root=ensureOutputRoot(output_root);const slug=safeSeg(siteName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'site','slug');const dir=path.join(root,slug);fs.mkdirSync(dir,{recursive:true});
  const contract={schema_version:'1.0.0',state_type:'CEREBRO_WEBSITE_SCAFFOLD_V1',company_id,engine_id:'WEB-001',environment:'PREPROD',version:'1.0.0',name:siteName,headline:h,description:String(description),cta:String(cta),seo:{title:siteName,description:String(description).slice(0,160),responsive:true,semantic_html:true},accessibility:{lang:'es',landmarks:true,focus_visible:true},prod_deploy_authorized:false,...authority()};
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(contract.seo.description)}"><title>${esc(siteName)}</title><link rel="stylesheet" href="styles.css"></head><body><header><nav aria-label="Principal"><strong>${esc(siteName)}</strong></nav></header><main><section class="hero"><h1>${esc(h)}</h1><p>${esc(description)}</p><a class="cta" href="#contacto">${esc(cta)}</a></section><section id="contacto"><h2>Contacto</h2><p>Conecta aquí el formulario gobernado de tu empresa.</p></section></main><footer><small>${esc(siteName)}</small></footer></body></html>\n`;
  const css=`:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif}*{box-sizing:border-box}body{margin:0;line-height:1.5}header,main,footer{max-width:1120px;margin:auto;padding:24px}.hero{padding:clamp(48px,10vw,120px) 0}.hero h1{font-size:clamp(2.2rem,7vw,5rem);line-height:1.02}.cta{display:inline-block;padding:12px 18px;border:2px solid currentColor;border-radius:10px;color:inherit;text-decoration:none}.cta:focus-visible{outline:3px solid currentColor;outline-offset:3px}\n`;
  writeSafe(dir,'index.html',html);writeSafe(dir,'styles.css',css);writeSafe(dir,'cerebro-web-contract.json',`${JSON.stringify(contract,null,2)}\n`);writeSafe(dir,'README.md',`# ${siteName}\n\nScaffold WEB-001 PREPROD. Responsive, semántico y sin dependencias. No implica publicación PROD.\n`);
  return Object.freeze({status:'GREEN_WEBSITE_SCAFFOLD_CREATED',output_dir:dir,file_count:4,contract_hash:hash(contract),contract,...authority()});
}

function nums(values){if(!Array.isArray(values)||values.length===0)throw new Error('values non-empty array required');const a=values.map(Number);if(a.some((x)=>!Number.isFinite(x)))throw new Error('values must be finite numbers');return a;}
function quantile(sorted,q){const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);}
export function descriptiveStatistics(values){const a=nums(values),sorted=[...a].sort((x,y)=>x-y),n=a.length,mean=a.reduce((s,x)=>s+x,0)/n;const variance=n>1?a.reduce((s,x)=>s+(x-mean)**2,0)/(n-1):0;const sd=Math.sqrt(variance);const se=sd/Math.sqrt(n);return Object.freeze({status:'GREEN_DESCRIPTIVE_STATS',n,mean,median:quantile(sorted,.5),min:sorted[0],max:sorted.at(-1),q1:quantile(sorted,.25),q3:quantile(sorted,.75),sample_variance:variance,sample_stddev:sd,standard_error:se,ci95_mean:[mean-1.96*se,mean+1.96*se],source_count:n,no_fabricated_metrics:true,...authority()});}
function erf(x){const sign=x<0?-1:1;const a=Math.abs(x),t=1/(1+.3275911*a);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);return sign*y;}
function normCdf(z){return .5*(1+erf(z/Math.SQRT2));}
export function twoProportionAB({control_success,control_total,variant_success,variant_total}={}){for(const [k,v] of Object.entries({control_success,control_total,variant_success,variant_total}))if(!Number.isInteger(v)||v<0)throw new Error(`${k} must be nonnegative integer`);if(control_total<1||variant_total<1||control_success>control_total||variant_success>variant_total)throw new Error('invalid experiment counts');const p1=control_success/control_total,p2=variant_success/variant_total,pool=(control_success+variant_success)/(control_total+variant_total),se=Math.sqrt(pool*(1-pool)*(1/control_total+1/variant_total));const z=se===0?0:(p2-p1)/se,p=2*(1-normCdf(Math.abs(z)));const lift=p1===0?null:(p2-p1)/p1;return Object.freeze({status:'GREEN_AB_TEST_ANALYSIS',control_rate:p1,variant_rate:p2,absolute_difference:p2-p1,relative_lift:lift,z_score:z,p_value_two_sided:p,significant_95:p<.05,method:'two-proportion-z-test',warning:'Decision quality also depends on experiment design, power, multiple testing and business relevance.',...authority()});}

export function buildStructuredReport({title,summary='',sections=[],metrics={},format='html'}={}){const t=req(title,'title',180);if(!Array.isArray(sections))throw new Error('sections must be array');const cleanSections=sections.map((s,i)=>({heading:req(s?.heading??`Sección ${i+1}`,'section.heading',180),body:String(s?.body??'')}));const fmt=String(format).toLowerCase();if(!['html','markdown'].includes(fmt))throw new Error('format must be html or markdown');let content;if(fmt==='markdown'){content=`# ${t}\n\n${String(summary)}\n\n`+Object.entries(metrics??{}).map(([k,v])=>`- **${k}**: ${v}`).join('\n')+'\n\n'+cleanSections.map((s)=>`## ${s.heading}\n\n${s.body}`).join('\n\n');}else{content=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><style>body{font-family:system-ui;max-width:960px;margin:auto;padding:40px;line-height:1.55}table{border-collapse:collapse}td{padding:8px 12px;border-bottom:1px solid #ddd}</style></head><body><h1>${esc(t)}</h1><p>${esc(summary)}</p><table>${Object.entries(metrics??{}).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>${cleanSections.map((s)=>`<section><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></section>`).join('')}</body></html>`;}return Object.freeze({status:'GREEN_REPORT_READY',format:fmt,content,content_sha256:hash(content),source_traceability_required:true,...authority()});}

function privateHost(host){const h=host.toLowerCase();if(h==='localhost'||h.endsWith('.local'))return true;const ip=net.isIP(h);if(!ip)return false;if(ip===4){const p=h.split('.').map(Number);return p[0]===10||p[0]===127||(p[0]===192&&p[1]===168)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===169&&p[1]===254);}return h==='::1'||h.startsWith('fc')||h.startsWith('fd')||h.startsWith('fe80:');}
export async function acquirePublicText({url,allowed_hosts,fetch_impl=fetch,max_bytes=512000}={}){if(!Array.isArray(allowed_hosts)||allowed_hosts.length===0)throw new Error('allowed_hosts non-empty array required');const u=new URL(req(url,'url',2048));if(u.protocol!=='https:'||u.username||u.password||privateHost(u.hostname))throw new Error('PUBLIC_HTTPS_URL_REQUIRED');const allowed=new Set(allowed_hosts.map((x)=>String(x).toLowerCase()));if(!allowed.has(u.hostname.toLowerCase()))throw new Error('HOST_NOT_ALLOWLISTED');const r=await fetch_impl(u,{method:'GET',redirect:'error',headers:{accept:'text/html,text/plain,application/json;q=0.9','user-agent':'CEREBRO-PUBLIC-READONLY/1.0'}});if(!r.ok)throw new Error(`PUBLIC_FETCH_HTTP_${r.status}`);const len=Number(r.headers?.get?.('content-length')??0);if(len>max_bytes)throw new Error('PUBLIC_FETCH_TOO_LARGE');const b=Buffer.from(await r.arrayBuffer());if(b.length>max_bytes)throw new Error('PUBLIC_FETCH_TOO_LARGE');const ct=String(r.headers?.get?.('content-type')??'').toLowerCase();if(!/(text\/|application\/json)/.test(ct))throw new Error('PUBLIC_FETCH_CONTENT_TYPE_DENIED');const text=b.toString('utf8');return Object.freeze({status:'GREEN_PUBLIC_READONLY_ACQUISITION',url:u.toString(),host:u.hostname,content_type:ct,bytes:b.length,text,content_sha256:hash(text),authenticated:false,captcha_bypass:false,anti_bot_bypass:false,rate_limit_bypass:false,...authority()});}

export function evaluateCommunicationText(text){const s=req(text,'text',20000);const words=s.trim().split(/\s+/),sentences=s.split(/[.!?]+/).map((x)=>x.trim()).filter(Boolean);const norm=words.map((x)=>x.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g,''));const counts=new Map();for(const w of norm)if(w.length>3)counts.set(w,(counts.get(w)??0)+1);const repeated=[...counts].filter(([,n])=>n>=4).map(([w,n])=>({word:w,count:n}));const jargon=(s.match(/\b(?:framework|pipeline|runtime|endpoint|deploy|rollback|scaffold|orquestaci[oó]n|idempotencia)\b/gi)??[]).length;const empathy=/\b(?:entiendo|comprendo|gracias|siento|te ayudo|vamos a resolver)\b/i.test(s);const actionFirst=/^(?:sí|no|hecho|puedes|debes|voy|está|queda|haz|abre|usa|necesitas|la respuesta)/i.test(s.trim());const score=Math.max(0,Math.min(1,1-(words.length>180?.12:0)-(repeated.length?.1:0)-(jargon>5?.08:0)+(actionFirst?.05:0)));return Object.freeze({status:'GREEN_COMMUNICATION_HEURISTIC',word_count:words.length,sentence_count:sentences.length,avg_words_per_sentence:sentences.length?words.length/sentences.length:words.length,repeated_terms:Object.freeze(repeated),jargon_hits:jargon,empathy_marker:empathy,answer_first_proxy:actionFirst,heuristic_quality_score:Number(score.toFixed(4)),measurement_scope:'DETERMINISTIC_HEURISTIC_NOT_HUMAN_JUDGMENT',...authority()});}

export async function runP0OperationalAction({technical_name,engine_id,environment='PREPROD',action,input={},registryFile=DEFAULT_REGISTRY,portfolioFile=DEFAULT_PORTFOLIO,engineRegistryFile=DEFAULT_ENGINES,fetch_impl=fetch}={}){
  const readonlyActions=new Set(['DESCRIPTIVE_STATS','AB_TEST','REPORT_RENDER','PUBLIC_FETCH','COMMUNICATION_EVAL']);
  const mode=action==='APP_SCAFFOLD'||action==='WEB_SCAFFOLD'?'GENERATE_ARTIFACT':action==='PUBLIC_FETCH'?'PUBLIC_READ':readonlyActions.has(action)?'ANALYZE':'PLAN';
  const gate=resolveP0Capability({technical_name,engine_id,environment,requested_mode:mode,registryFile,portfolioFile,engineRegistryFile});if(!gate.allowed)return Object.freeze({status:'DENY_OPERATIONAL_ACTION',gate,...authority()});
  const env=String(environment).toUpperCase();if((action==='APP_SCAFFOLD'||action==='WEB_SCAFFOLD')&&env==='PROD')return Object.freeze({status:'DENY_PROD_ARTIFACT_MUTATION',gate,...authority()});
  let result;
  if(action==='APP_SCAFFOLD')result=createCrossDeviceAppScaffold(input);
  else if(action==='WEB_SCAFFOLD')result=createWebsiteScaffold(input);
  else if(action==='DESCRIPTIVE_STATS')result=descriptiveStatistics(input.values);
  else if(action==='AB_TEST')result=twoProportionAB(input);
  else if(action==='REPORT_RENDER')result=buildStructuredReport(input);
  else if(action==='PUBLIC_FETCH')result=await acquirePublicText({...input,fetch_impl});
  else if(action==='COMMUNICATION_EVAL')result=evaluateCommunicationText(input.text);
  else throw new Error(`unsupported action: ${action}`);
  return Object.freeze({status:'GREEN_P0_OPERATION_COMPLETE',gate,result,...authority()});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){const out=arg('--output');const report=buildP0OperationalCatalog();const text=`${JSON.stringify(report,null,2)}\n`;if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,text,'utf8');}process.stdout.write(text);}
