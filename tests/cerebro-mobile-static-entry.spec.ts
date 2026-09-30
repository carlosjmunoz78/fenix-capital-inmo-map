import {test,expect} from '@playwright/test';

const session={
  access_token:'qa-cerebro-token-not-real',
  refresh_token:'qa-cerebro-refresh-not-real',
  expires_at:1999999999,
  user:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',email:'cerebro@fenix.test'}
};

test('mobile static Console reuses session and preserves exact pending action',async({page})=>{
  const chatBodies:any[]=[];

  await page.addInitScript(s=>{
    localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(s));
  },session);

  await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/health')){
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        status:'ok',authenticated_transport:true,direct_model_access:false,live_writes:false,
        environment:'LAB',version:'0.4.0-owner-decision-knowledge',chat_available:true,
        chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'
      })});
    }
    if(url.endsWith('/chat')){
      const body=JSON.parse(route.request().postData()||'{}');
      chatBodies.push(body);
      if(!body.pending_action){
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
          status:'ACTION_PROPOSAL',executed:false,message:'Activar SEO para Valencia y provincia. ¿Quieres que active exactamente este proceso?',
          action:{action_id:'SEO-ZONE-valencia-V1',action_type:'SEO_ZONE_ACTIVATION',engine_id:'SEO-001',company_id:'fenix',
            scope:{location:'Valencia',coverage:'capital_and_province'},summary:'Activar SEO para Valencia y provincia.',proposal_hash:'hash-v1'}
        })});
      }
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
        status:'ACTION_EXPLANATION',executed:false,message:'El proceso incluye keywords, arquitectura, contenidos, SEO local y QA. ¿Quieres que active este proceso?',
        action:body.pending_action
      })});
    }
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });

  await page.goto('/cerebro/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#pill')).toHaveText('Conectado');
  await expect(page.locator('#input')).toBeEnabled();

  await page.locator('#input').fill('Prepara Valencia en SEO');
  await page.locator('#send').click();
  await expect(page.locator('#log')).toContainText('Activar SEO para Valencia y provincia');
  expect(chatBodies[0].pending_action).toBeNull();

  await page.locator('#input').fill('¿En qué consiste?');
  await page.locator('#send').click();
  await expect(page.locator('#log')).toContainText('keywords, arquitectura, contenidos');
  expect(chatBodies[1].pending_action?.proposal_hash).toBe('hash-v1');
  expect(chatBodies[1].pending_action?.scope?.location).toBe('Valencia');
});
