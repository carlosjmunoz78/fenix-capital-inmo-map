import {expect,test,type Page} from '@playwright/test';

const SUPABASE_PREPROD='https://hnqlnvakzaywtafeiybt.supabase.co';
const SUPABASE_PROD='https://cluhljgonannaafpmblx.supabase.co';

function b64url(value:unknown){return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')}
function qaSession(){const now=Math.floor(Date.now()/1000);const metadata={actor_code:'CARLOS-ADMIN',role:'Dirección'};const accessToken=`${b64url({alg:'none',typ:'JWT'})}.${b64url({aud:'authenticated',exp:now+3600,sub:'jarvis-v1-preprod',email:'jarvis-v1@fenix.test',role:'authenticated',user_metadata:metadata})}.qa`;return{access_token:accessToken,token_type:'bearer',expires_in:3600,expires_at:now+3600,refresh_token:'qa-refresh-jarvis-v1-preview',user:{id:'jarvis-v1-preprod',aud:'authenticated',role:'authenticated',email:'jarvis-v1@fenix.test',email_confirmed_at:new Date().toISOString(),phone:'',confirmed_at:new Date().toISOString(),last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:metadata,identities:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString(),is_anonymous:false}}}

async function installIsolatedPreprod(page:Page){
 const session=qaSession();
 await page.addInitScript(value=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(value));sessionStorage.setItem('fenix-session-active','1')},session);
 await page.route(`${SUPABASE_PREPROD}/functions/v1/**`,async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/fenix-app-gateway-test/session/context')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección',context_source:'qa-preprod-fixture'})});return}if(url.pathname.endsWith('/fenix-app-gateway-test/navigation')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{route:'/inicio',label:'Inicio'}]})});return}if(url.pathname.endsWith('/jarvis-work-gateway-v1-preprod/projects')){await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({status:'CLOSED'})});return}if(url.pathname.includes('/cerebro-browser-gateway-v1/owner/companies')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,companies:[{company_id:'fenix',company_label:'Fénix Capital',allowed:true,profile_id:'Default',start_url:'https://fenixcapital.es'}]})});return}if(url.pathname.includes('/cerebro-browser-gateway-v1/owner/status')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,session:{company_id:'fenix',session_id:'qa-browser',state:'CEREBRO_CONTROL',control_owner:'CEREBRO',worker_alive:true,current_url:'https://fenixcapital.es',current_title:'Fénix Capital',human_required:false,reason_code:null}})});return}await route.fulfill({status:200,contentType:'application/json',body:'{}'})});
 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-gateway-v0/**`,async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/health')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',service:'CEREBRO Console Gateway',environment:'PREPROD_QA',version:'jarvis-v1-preview',authenticated_transport:true,direct_model_access:false,prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'DETERMINISTIC_READ_ONLY'})});return}if(url.pathname.endsWith('/preferences')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',preferences:{tone:'warm_close_caring',response_length:'concise',speech_rate:'1.08',speech_pitch:'1.04'}})});return}if(url.pathname.endsWith('/chat')){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',intent:'qa_preview',message:'Respuesta aislada PREPROD.',executed:false,context_applied:true})});return}await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({status:'error'})})});
 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-activity-v0/**`,async route=>{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'OK',observed_at:new Date().toISOString(),source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',runs:[{run_id:1,workflow_name:'QA',workflow_alias:'Workspace QA',workflow_path:'qa.yml',status:'completed',conclusion:'success',event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions',created_at:new Date().toISOString(),run_started_at:new Date().toISOString(),updated_at:new Date().toISOString(),engine_id:'QA-001',company_id:'fenix',environment:'PREPROD',version:'v1',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:null,progress_completed_steps:null,progress_total_steps:null,current_step:null,next_step:null,progress_provenance:'TERMINAL_STATUS',jobs_provenance:'UNAVAILABLE'}],physical_totals:{running_observed:0,queued_observed:0,active_observed:0,provenance:'GITHUB_ACTION_RUN_TOTALS',semantics:'LOWER_BOUND_PHYSICAL_JOBS'}})})});
}

async function expectPrimaryNavigation(page:Page){for(const label of ['Inicio','Jarvis','Operativa','Neuronal','Navegador'])await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible()}
async function expectNoHorizontalOverflow(page:Page){const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(1)}
async function expectNoLegacyBrand(page:Page){await expect.poll(async()=>page.evaluate(()=>/\bCEREBRO\b/i.test(document.body.innerText))).toBe(false)}
async function fontSize(page:Page,selector:string){return page.locator(selector).first().evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize))}

async function expectCleanHome(page:Page){
 await expectPrimaryNavigation(page);
 await expect(page.getByRole('region',{name:'Inicio de Jarvis'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Proyectos'})).toBeVisible();
 await expect(page.getByText('Auditoría Total',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Proyectos y subproyectos'})).toHaveCount(0);
 await expect(page.getByRole('complementary',{name:'Ejecución y evidencias'})).toHaveCount(0);
 await expect(page.getByText('WORKSPACE',{exact:true})).toHaveCount(0);
 await expect(page.getByText('FÉNIX',{exact:true})).toHaveCount(0);
 const composer=page.locator('.operativa-composer-form textarea').first();
 await expect(composer).toBeVisible();
 await expect(composer).toHaveAttribute('placeholder','');
 await expect(page.getByRole('button',{name:'Añadir archivo'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Dictar'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Conversación por voz'})).toBeVisible();
 await expectNoLegacyBrand(page);
 await expectNoHorizontalOverflow(page);
}

async function openAuditProject(page:Page){
 await page.getByRole('button',{name:/Auditoría Total/}).first().click();
 await expect(page.getByRole('button',{name:'Inicio de Jarvis',exact:true})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Proyectos y subproyectos'})).toBeVisible();
 await expect(page.locator('.jarvis-center-pane')).toBeVisible();
}

async function ensureExecutionVisible(page:Page){
 const execution=page.getByRole('complementary',{name:'Ejecución y evidencias'});
 if(await execution.count()===0)await page.getByTitle('Mostrar u ocultar ejecución').click();
 await expect(execution).toBeVisible();
}

async function expectProjectContract(page:Page){
 await expect(page.getByText('01 · Auditoría Total',{exact:true})).toBeVisible();
 await expect(page.getByTitle('Restaurar distribución')).toBeVisible();
 await expect(page.getByTitle('Maximizar conversación')).toBeVisible();
 await expect(page.getByTitle('Minimizar conversación')).toBeVisible();
 const composer=page.locator('.operativa-composer-form textarea').first();
 await expect(composer).toBeVisible();
 await expect(composer).toHaveAttribute('placeholder','');
 await expectNoLegacyBrand(page);
 await expectNoHorizontalOverflow(page);
 expect(await fontSize(page,'.operativa-composer-form textarea')).toBeGreaterThanOrEqual(14);
 expect(await fontSize(page,'.jarvis-center-project strong')).toBeGreaterThanOrEqual(13);
}

test('JARVIS Work PREPROD · clean home + project workspace + Codex/Work + Operativa regression',async({page})=>{
 await page.setViewportSize({width:1440,height:695});
 await installIsolatedPreprod(page);
 await page.goto('/cerebro?section=jarvis');
 await expectCleanHome(page);
 await openAuditProject(page);
 await expectProjectContract(page);

 const maximizeConversation=page.getByTitle('Maximizar conversación');
 await maximizeConversation.click();
 await expect(page.getByTitle('Restaurar tamaño')).toBeVisible();
 await page.getByTitle('Restaurar tamaño').click();
 await expect(page.getByTitle('Maximizar conversación')).toBeVisible();

 await ensureExecutionVisible(page);
 await page.getByTitle('Mostrar u ocultar ejecución').click();
 await expect(page.getByRole('complementary',{name:'Ejecución y evidencias'})).toHaveCount(0);
 await page.getByRole('button',{name:'Inicio de Jarvis',exact:true}).click();
 await expectCleanHome(page);
 await openAuditProject(page);
 await expect(page.getByRole('complementary',{name:'Ejecución y evidencias'})).toHaveCount(0);
 await page.getByTitle('Mostrar u ocultar ejecución').click();
 await expect(page.getByRole('complementary',{name:'Ejecución y evidencias'})).toBeVisible();

 const composer=page.locator('.operativa-composer-form textarea').first();
 await expect(composer).toBeEnabled();
 await composer.fill('Prueba aislada PREPROD');
 await page.locator('.operativa-send').click();
 await expect(page.getByText('Prueba aislada PREPROD',{exact:true})).toBeVisible();
 await expect(page.getByText('Respuesta aislada PREPROD.',{exact:true})).toBeVisible();
 await expectNoLegacyBrand(page);

 await page.getByRole('button',{name:'Herramientas',exact:true}).click();
 await expect(page.getByRole('button',{name:'Código',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Git',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Navegador',exact:true}).last()).toBeVisible();
 await page.getByRole('button',{name:'Git',exact:true}).click();
 for(const name of ['Estado','Diff','CI','vs main'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
 await expect(page.getByText('main y emergency-pages bloqueadas',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Navegador',exact:true}).last().click();
 await expect(page.getByRole('button',{name:/Abrir navegador interactivo/})).toBeVisible();
 await expect(page.getByText('JARVIS EN CONTROL',{exact:true})).toBeVisible();
 await expectNoLegacyBrand(page);
 await expectNoHorizontalOverflow(page);
 await page.screenshot({path:'test-results/jarvis-project-workspace-1440x695.png',fullPage:true});

 await page.getByRole('button',{name:'Inicio de Jarvis',exact:true}).click();
 await page.screenshot({path:'test-results/jarvis-clean-home-1440x695.png',fullPage:true});
 await page.setViewportSize({width:695,height:900});
 await expectCleanHome(page);
 await page.screenshot({path:'test-results/jarvis-clean-home-narrow-695.png',fullPage:true});

 await page.setViewportSize({width:1440,height:695});
 await page.getByRole('button',{name:'Operativa',exact:true}).click();
 await expect(page.locator('main.operativa-premium[aria-label="Operativa"]')).toBeVisible();
 await expectPrimaryNavigation(page);
 await expectNoLegacyBrand(page);
 await expectNoHorizontalOverflow(page);
 await page.screenshot({path:'test-results/operativa-v4-regression-1440x695.png',fullPage:true});

 await page.getByRole('button',{name:'Navegador',exact:true}).first().click();
 await expectNoLegacyBrand(page);
 await expectNoHorizontalOverflow(page);
 await page.screenshot({path:'test-results/navegador-branding-1440x695.png',fullPage:true});
});


test('JARVIS UX · physical typography remains legible on desktop and mobile',async({page})=>{
  for(const width of [1440,1024,695]){
    await page.setViewportSize({width,height:900});
    await installIsolatedPreprod(page);
    await page.goto('/cerebro?section=jarvis');
    await expectCleanHome(page);
    await expect(page.locator('.jarvis-home-project-card').first()).toBeVisible();
    expect(await fontSize(page,'.jarvis-home-project-copy strong')).toBeGreaterThanOrEqual(width<=480?15:16);
    expect(await fontSize(page,'.jarvis-home-project-copy p')).toBeGreaterThanOrEqual(14);
    expect(await fontSize(page,'.jarvis-home-project-copy small')).toBeGreaterThanOrEqual(12);
    expect(await fontSize(page,'.jarvis-home-search input')).toBeGreaterThanOrEqual(15);
    expect(await fontSize(page,'.jarvis-home-actions button')).toBeGreaterThanOrEqual(13);
    const cardHeight=await page.locator('.jarvis-home-project-card').first().evaluate(el=>Number.parseFloat(getComputedStyle(el).minHeight));
    expect(cardHeight).toBeGreaterThanOrEqual(width<=900?138:150);
    await expectNoHorizontalOverflow(page);
  }
});


test('JARVIS UX · font controls persist readable size and two-column desktop layout',async({page})=>{
 await page.setViewportSize({width:1024,height:900});
 await installIsolatedPreprod(page);
 await page.goto('/cerebro?section=jarvis');
 await expectCleanHome(page);
 const title=page.locator('.jarvis-home-project-copy strong').first();
 const body=page.locator('.jarvis-home-project-copy p').first();
 expect(await fontSize(page,'.jarvis-home-project-copy strong')).toBeGreaterThanOrEqual(18);
 expect(await fontSize(page,'.jarvis-home-project-copy p')).toBeGreaterThanOrEqual(16);
 const columns=await page.locator('.jarvis-home-projects').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 expect(columns).toBe(2);
 await page.getByRole('button',{name:'Aumentar letra'}).click();
 expect(await title.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
 expect(await body.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
 await page.reload();
 await expectCleanHome(page);
 expect(await fontSize(page,'.jarvis-home-project-copy strong')).toBeGreaterThanOrEqual(20);
 await page.getByRole('button',{name:'Reducir letra'}).click();
 expect(await fontSize(page,'.jarvis-home-project-copy strong')).toBe(18);
});
