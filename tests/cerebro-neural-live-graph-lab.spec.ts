import {expect,test,type Page} from '@playwright/test';

const ACTIVITY='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**';
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};
function encode(o:unknown){return Buffer.from(JSON.stringify(o)).toString('base64url')}
const accessToken=`${encode({alg:'none',typ:'JWT'})}.${encode({aud:'authenticated',role:'authenticated',sub:'owner-qa',exp:1999999999})}.isolated-test`;
const user={id:'owner-qa',aud:'authenticated',role:'authenticated',email:'owner@fenix.test',app_metadata:{},user_metadata:{actor_code:'CARLOS-ADMIN'},created_at:'2026-11-14T00:00:00Z'};
const session={access_token:accessToken,token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'isolated-qa-refresh',user};
function run(id:number,state:string,engine:string,url?:string){
 return {run_id:id,workflow_name:engine,workflow_alias:engine,workflow_path:'.github/workflows/qa.yml',status:state,conclusion:state==='completed'?'success':null,event:'workflow_dispatch',html_url:url||`https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/${id}`,created_at:'2026-11-14T17:00:00Z',run_started_at:'2026-11-14T17:01:00Z',updated_at:'2026-11-14T17:02:00Z',engine_id:engine,company_id:'fenix',environment:'LAB',version:'sha-qa',source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',progress_percent:null,progress_completed_steps:null,progress_total_steps:null,current_step:'Test',next_step:null,progress_provenance:'UNAVAILABLE'};
}
async function setup(page:Page,source:'LIVE'|'CACHED'|'UNAVAILABLE',runs:ReturnType<typeof run>[]=[]){
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));sessionStorage.setItem('fenix-session-active','1')},session);
 await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});const u=route.request().url();return route.fulfill({status:200,headers,body:JSON.stringify(u.includes('/user')?user:session)})});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});const u=route.request().url();return route.fulfill({status:200,headers,body:JSON.stringify(u.endsWith('/session/context')?{actor_code:'CARLOS-ADMIN',role:'Dirección'}:{items:[]})})});
 await page.route(ACTIVITY,async route=>{if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});if(source==='UNAVAILABLE')return route.fulfill({status:503,headers,body:JSON.stringify({status:'ERROR'})});return route.fulfill({status:200,headers,body:JSON.stringify({status:'OK',observed_at:'2026-11-14T17:02:00Z',source:'GITHUB_ACTIONS',source_status:source,repository:'carlosjmunoz78/fenix-capital-inmo-map',runs})})});
 await page.goto('/cerebro?section=neuronal',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Núcleo de actividad'})).toBeVisible();
}

test('neuronal: live evidence, organic graph, interaction, trustworthy link and original metrics',async({page})=>{
 await setup(page,'LIVE',[run(911,'in_progress','FACT-001'),run(912,'queued','QA-001'),run(913,'completed','SUP-001')]);
 const panel=page.getByRole('region',{name:'Red neuronal de actividad comprobada'});
 await expect(panel).toContainText('3 ejecuciones observadas');
 await expect(panel.locator('svg.ng-unused')).toHaveCount(0);
 await expect(panel.locator('.ng-background path')).toHaveCount(5);
 await expect(panel.locator('.ng-node')).toHaveCount(3);
 await panel.getByRole('button',{name:'Acercar red'}).click();
 await expect(panel.getByLabel('Nivel de profundidad')).toHaveText('Detalle');
 await panel.getByRole('button',{name:'Reducir movimiento'}).click();
 await expect(panel.getByRole('button',{name:'Activar movimiento'})).toHaveAttribute('aria-pressed','true');
 await panel.getByText('Explorar ejecuciones por nombre (3)').click();
 await panel.getByRole('button',{name:'FACT-001'}).click();
 await expect(panel.getByRole('link',{name:'Ver ejecución original'})).toHaveAttribute('href','https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/911');
 await expect(page.getByRole('region',{name:'Resumen neuronal verificable'})).toContainText('PARCIAL');
});

test('neuronal: cached evidence is not animated or falsely claimed as live; links are validated',async({page})=>{
 await setup(page,'CACHED',[run(911,'in_progress','FACT-001','https://malicious.invalid/x')]);
 const panel=page.getByRole('region',{name:'Red neuronal de actividad comprobada'});
 await expect(panel).toHaveClass(/is-quiet/);
 await expect(panel).toContainText('Última información disponible');
 await panel.getByText('Explorar ejecuciones por nombre (1)').click();
 await panel.getByRole('button',{name:'FACT-001'}).click();
 await expect(panel).toContainText('Último estado: En curso');
 await expect(panel.getByRole('link',{name:'Ver ejecución original'})).toHaveCount(0);
 await expect(panel).toContainText('Enlace de evidencia no validado');
});

test('neuronal: unavailable activity does not generate fictional executions',async({page})=>{
 await setup(page,'UNAVAILABLE');
 const panel=page.getByRole('region',{name:'Red neuronal de actividad comprobada'});
 await expect(panel).toContainText('0 ejecuciones observadas');
 await expect(panel).toContainText('Sin conexión verificable');
 await expect(panel.locator('.ng-node')).toHaveCount(0);
 await expect(panel.getByText('Explorar ejecuciones por nombre')).toHaveCount(0);
});

test('neuronal: mobile inspection retains usable touch controls and no panel overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await setup(page,'LIVE',[run(914,'queued','QA-001')]);
 const panel=page.getByRole('region',{name:'Red neuronal de actividad comprobada'});
 const rect=await panel.boundingBox();
 expect(rect).not.toBeNull();
 expect(rect!.width).toBeLessThanOrEqual(376);
 await panel.getByText('Explorar ejecuciones por nombre (1)').click();
 const item=panel.getByRole('button',{name:'QA-001'});
 const itemRect=await item.boundingBox();
 expect(itemRect?.height||0).toBeGreaterThanOrEqual(43);
 await item.click();
 await expect(panel.getByRole('link',{name:'Ver ejecución original'})).toBeVisible();
});
