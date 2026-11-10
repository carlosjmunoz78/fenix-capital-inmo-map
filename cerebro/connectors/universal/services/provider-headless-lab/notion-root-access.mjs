// FACT-001 · Read-only permission audit using INDEPENDENT CEREBRO Notion Vault credential.
// No page bodies, titles or secrets are returned/logged. Fixed roots originally opened in Opera.
// Static allowlist; client cannot add arbitrary page IDs, write methods or request URLs.
export const NOTION_OPENED_ROOTS=Object.freeze([
 ['Wiki Fénix Capital','1c481b1a-756d-8002-813d-f3efdd4ecd89','page'],
 ['Comandos IA Fenix Capital','37d81b1a-756d-8002-b611-d4ce3a60965a','page'],
 ['Fénix Capital','3b981b1a-756d-819a-9170-c1b2045cab01','page'],
 ['CRM Fénix Capital PRO','37581b1a-756d-8020-a712-f057c39460cf','page'],
 ['EXPEDIENTES','7155f2d6-a209-4e1d-b405-67bbf4bc54ef','page'],
 ['BANCOS','1c381b1a-756d-8059-ae8b-e20c7ada3d70','page'],
 ['INMOBILIARIAS','1c381b1a-756d-809f-9eae-cde51542fd3b','page'],
 ['Financieros','1c381b1a-756d-807f-b3d0-ebb04b4ff0ae','page'],
 ['JARVIS Fénix Capital','55e81b1a-756d-8303-8626-016963610cb6','page'],
 ['SEO-001','3e981b1a-756d-81d2-ae7d-f638b31f6f1e','page'],
 ['Wiki Redes Sociales','38281b1a-756d-8041-9c17-daff1b0afde0','page'],
 ['Habilidades IA','37681b1a-756d-819e-848e-e71ad5a45d95','page'],
 ['Buyer Personas Fénix','66e23000-789c-487f-8f63-2be8fb106b09','database'],
 ['Recursos Web y Landings','928566e1-317f-439f-8e45-95088eeb5bae','database'],
 ['Promos y Campañas','401e9011-1d79-4231-95a3-83f0e384876','database'],
 ['Estrategia Redes','67e2be51-a935-4676-a622-126feba520d5','database'],
 ['Calendario Editorial','236a3d97-024a-4a15-b445-c7b528b634af','database'],
 ['Fábrica de Contenido','72d1d1fe-5e0a-4b64-be3e-5e145b8a0bb4','database'],
 ['Programación Editorial','cd854935-a4bd-42a1-872a-c6fec1c6fe71','database'],
 ['Publicación Editorial','523bf2a3-d693-4fd8-940a-aedd0472d754','database'],
 ['Analítica y Resultados','b9617895-f7bf-4377-9c9a-1c335180d6ae','database'],
 ['CEREBRO SEO City Complete','3e281b1a-756d-81da-9ba0-d86e48501e79','page'],
 ['Tareas CRM Notion','1c981b1a-756d-8039-9fc6-f1d836fdc718','page'],
 ['Manual Marca Fénix','37c81b1a-756d-804b-8a81-c15043c4f0f4','page'],
 ['Centro decisión CEREBRO','3ba81b1a-756d-8118-8a48-eebf163b9f1c','page'],
 ['APP Fénix Checklist','3c181b1a-756d-8149-a705-f358c60a16a4','page'],
 ['Importaciones antiguas','9efdc294-a200-4696-83b8-9bb20c3c0a1f','page'],
].map(([name,id,type])=>Object.freeze({name,id,type})));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertSafeList(){
 if(NOTION_OPENED_ROOTS.length!==27||new Set(NOTION_OPENED_ROOTS.map(x=>x.id)).size!==27||
   NOTION_OPENED_ROOTS.some(x=>!UUID.test(x.id)||!['page','database'].includes(x.type)))throw Error('NOTION_ROOT_ALLOWLIST_INVALID');
}
export async function probeNotionOpenedRoots({token,http=fetch,roots=NOTION_OPENED_ROOTS}={}){
 assertSafeList();
 if(roots!==NOTION_OPENED_ROOTS)throw Error('NOTION_ROOTS_USER_SELECTION_DENIED');
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('NOTION_SERVICE_CREDENTIAL_INVALID');
 const results=[];
 // One request at a time to honor Notion rate limits; no automatic write or retry.
 for(const {name,id,type} of roots){
  // Notion average request budget ~3/s. No delay in injected unit tests.
  if(http===fetch && results.length>0)await new Promise(resolve=>setTimeout(resolve,380));
  const url='https://api.notion.com/v1/'+(type==='database'?'databases/':'pages/')+id;
  let response;
  try{response=await http(url,{method:'GET',headers:{Authorization:'Bearer '+token,'Notion-Version':'2026-03-11',Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(9000)});}
  catch{results.push({name,id,type,status:'UNVERIFIED_NETWORK'});continue;}
  if(response.status===200){results.push({name,id,type,status:'ACCESS_VERIFIED'});continue;}
  if(response.status===404){results.push({name,id,type,status:'NO_INDEPENDENT_ACCESS'});continue;}
  if(response.status===401||response.status===403)throw Error('NOTION_GLOBAL_AUTH_DENIED_'+response.status);
  if(response.status===429){results.push({name,id,type,status:'RATE_LIMIT_UNVERIFIED'});continue;}
  results.push({name,id,type,status:'UPSTREAM_UNVERIFIED_'+response.status});
 }
 return {status:'NOTION_INDEPENDENT_ROOT_PERMISSION_AUDIT',provider:'notion',
  scope:{company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},
  checked:results.length,accessible:results.filter(x=>x.status==='ACCESS_VERIFIED').length,
  denied:results.filter(x=>x.status==='NO_INDEPENDENT_ACCESS').length,
  inconclusive:results.filter(x=>!['ACCESS_VERIFIED','NO_INDEPENDENT_ACCESS'].includes(x.status)).length,
  results,read_only:true,write_operations:0,credentials_exposed:false,content_returned:false};
}
