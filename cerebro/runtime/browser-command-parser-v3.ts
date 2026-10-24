export type BrowserLowLevelCommand={command_type:'OPEN_TAB'|'CLOSE_TAB'|'BACK'|'FORWARD'|'RELOAD'|'SCROLL'|'SWITCH_TAB';payload:Record<string,unknown>};
export type BrowserPostcondition=
 | {kind:'GOOGLE_RESULTS';query:string}
 | {kind:'URLS_OPEN';urls:string[]};
export type ParsedBrowserCommand={ok:true;commands:BrowserLowLevelCommand[];summary:string;postcondition?:BrowserPostcondition}|{ok:false;error:string};
export type BrowserOutcomeSnapshot={current_url?:string|null;current_title?:string|null;tabs?:Array<{url?:string|null;title?:string|null;active?:boolean}>|null};
export type BrowserPostconditionResult={state:'SATISFIED'|'PENDING'|'FAILED';error?:string};

const MAX_NEW_TABS_PER_ORDER=7;

function normal(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function quotedQuery(text:string){const m=text.match(/[“"]([^”"]{2,200})[”"]/);return m?.[1]?.trim()||'';}
function normalizeHttpUrl(value:string){
 const clean=value.trim().replace(/[.)]+$/,'');
 if(!clean)return'';
 const candidate=/^https?:\/\//i.test(clean)?clean:`https://${clean}`;
 try{const url=new URL(candidate);if(url.protocol!=='http:'&&url.protocol!=='https:')return'';return url.toString();}catch{return'';}
}
function urlsIn(text:string){
 const matches=text.match(/(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:\/[^\s,;”"]*)?/gi)??[];
 const seen=new Set<string>();const result:string[]=[];
 for(const match of matches){const url=normalizeHttpUrl(match);if(url&&!seen.has(url)){seen.add(url);result.push(url);}}
 return result;
}
function urlIn(text:string){return urlsIn(text)[0]||'';}
function urls(snapshot:BrowserOutcomeSnapshot){return [snapshot.current_url,...(snapshot.tabs??[]).map(tab=>tab?.url)].filter((value):value is string=>typeof value==='string'&&value.length>0);}
function isGoogleAutomationBlock(raw:string){try{const u=new URL(raw);return /(^|\.)google\./i.test(u.hostname)&&u.pathname.startsWith('/sorry/');}catch{return false;}}
function comparableHost(value:string){return value.toLowerCase().replace(/^www\./,'');}
function destinationMatches(expectedRaw:string,actualRaw:string){
 try{
  const expected=new URL(expectedRaw);const actual=new URL(actualRaw);
  const expectedHost=comparableHost(expected.hostname);const actualHost=comparableHost(actual.hostname);
  const sameHost=expectedHost===actualHost||(/^google\./.test(expectedHost)&&/^google\./.test(actualHost));
  if(!sameHost)return false;
  const expectedPath=expected.pathname.replace(/\/+$/,'')||'/';
  const actualPath=actual.pathname.replace(/\/+$/,'')||'/';
  return expectedPath==='/'||actualPath===expectedPath||actualPath.startsWith(`${expectedPath}/`);
 }catch{return false;}
}
function requestedTabCount(normalized:string){
 const match=normalized.match(/\b(?:abre|abrir|abreme|crea|crear)\s+(\d{1,2})\s+pestanas?\b/);
 if(!match)return 0;
 const count=Number(match[1]);return Number.isInteger(count)?count:0;
}

export function evaluateBrowserPostcondition(postcondition:BrowserPostcondition|undefined,snapshot:BrowserOutcomeSnapshot):BrowserPostconditionResult{
 if(!postcondition)return{state:'SATISFIED'};
 const all=urls(snapshot);
 if(all.some(isGoogleAutomationBlock))return{state:'FAILED',error:'EXTERNAL_SITE_AUTOMATION_BLOCKED'};
 if(postcondition.kind==='GOOGLE_RESULTS'){
  for(const raw of all){try{const u=new URL(raw);const google=/(^|\.)google\./i.test(u.hostname);const query=u.searchParams.get('q')||'';if(google&&u.pathname==='/search'&&normal(query)===normal(postcondition.query))return{state:'SATISFIED'};}catch{/* ignore transient/non-http urls */}}
  return{state:'PENDING'};
 }
 if(postcondition.kind==='URLS_OPEN'){
  const complete=postcondition.urls.every(expected=>all.some(actual=>destinationMatches(expected,actual)));
  return complete?{state:'SATISFIED'}:{state:'PENDING'};
 }
 return{state:'PENDING'};
}

export function parseBrowserCommand(input:string):ParsedBrowserCommand{
 const text=String(input||'').trim();if(!text)return{ok:false,error:'ORDEN_VACIA'};
 const n=normal(text);
 const wantsNew=/\b(nueva? pestana|abre? (?:una )?pestana|abrir (?:una )?pestana)\b/.test(n);
 const wantsTabs=wantsNew||/\b(?:abre|abrir|abreme|crea|crear)\b[\s\S]{0,120}\bpestanas?\b/.test(n);
 const wantsSearch=/\b(busca|buscar|buscame|googlea|googlear)\b/.test(n);
 const query=quotedQuery(text);
 const rawUrls=urlsIn(text);
 const rawUrl=rawUrls[0]||'';
 const requestedCount=requestedTabCount(n);

 if(wantsSearch&&query){
  const base=rawUrl&&/google\./i.test(rawUrl)?rawUrl:'https://www.google.es/';
  const host=new URL(base);const search=`${host.protocol}//${host.host}/search?q=${encodeURIComponent(query)}`;
  return{ok:true,commands:[{command_type:'OPEN_TAB',payload:{url:search}}],summary:`Abrir resultados de búsqueda: ${query}`,postcondition:{kind:'GOOGLE_RESULTS',query}};
 }

 if(wantsTabs&&rawUrls.length>1){
  if(rawUrls.length>MAX_NEW_TABS_PER_ORDER)return{ok:false,error:'MAXIMO_7_NUEVAS_PESTANAS_POR_ORDEN'};
  if(requestedCount&&requestedCount!==rawUrls.length)return{ok:false,error:'NUMERO_PESTANAS_NO_COINCIDE_CON_URLS'};
  return{
   ok:true,
   commands:rawUrls.map(url=>({command_type:'OPEN_TAB' as const,payload:{url}})),
   summary:`Abrir ${rawUrls.length} pestañas`,
   postcondition:{kind:'URLS_OPEN',urls:rawUrls},
  };
 }

 if(wantsTabs&&requestedCount>1&&!rawUrls.length){
  if(requestedCount>MAX_NEW_TABS_PER_ORDER)return{ok:false,error:'MAXIMO_7_NUEVAS_PESTANAS_POR_ORDEN'};
  return{ok:true,commands:Array.from({length:requestedCount},()=>({command_type:'OPEN_TAB' as const,payload:{url:'about:blank'}})),summary:`Abrir ${requestedCount} pestañas nuevas`};
 }

 if(wantsTabs&&requestedCount>1&&rawUrls.length===1)return{ok:false,error:'NUMERO_PESTANAS_NO_COINCIDE_CON_URLS'};
 if(wantsNew&&rawUrl)return{ok:true,commands:[{command_type:'OPEN_TAB',payload:{url:rawUrl}}],summary:`Abrir pestaña: ${rawUrl}`,postcondition:{kind:'URLS_OPEN',urls:[rawUrl]}};
 if(wantsNew)return{ok:true,commands:[{command_type:'OPEN_TAB',payload:{url:'about:blank'}}],summary:'Abrir pestaña nueva'};
 if(/\b(cierra|cerrar) (?:la )?pestana\b/.test(n))return{ok:false,error:'CERRAR_PESTANA_REQUIERE_CONTROL_MANUAL'};
 if(/\b(atras|volver atras|ve atras)\b/.test(n))return{ok:true,commands:[{command_type:'BACK',payload:{}}],summary:'Atrás'};
 if(/\b(adelante|ve adelante)\b/.test(n))return{ok:true,commands:[{command_type:'FORWARD',payload:{}}],summary:'Adelante'};
 if(/\b(recarga|recargar|actualiza|actualizar)\b/.test(n))return{ok:true,commands:[{command_type:'RELOAD',payload:{}}],summary:'Recargar página'};
 return{ok:false,error:'ORDEN_NAVEGADOR_NO_RECONOCIDA'};
}
