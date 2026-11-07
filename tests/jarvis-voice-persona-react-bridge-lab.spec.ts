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


// These tests mock network + browser audio. They are NOT proof of a real
// owner's microphone, authenticated PROD, or proprietary JARVIS voice.
test('JARVIS sends through canonical React chat: one POST, one user bubble, one reply',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await installIsolatedPreprod(page);
 let posts=0;
 let message='';
 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-gateway-v0/chat`,async route=>{
  posts++;
  message=String(route.request().postDataJSON()?.message||'');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   status:'OK',intent:'qa',message:'Recibido. Soy JARVIS, ¿qué necesitas?',executed:false
  })});
 });
 await page.goto('/cerebro?section=jarvis');
 const box=page.getByRole('textbox',{name:'Mensaje para Jarvis'});
 await expect(box).toBeVisible();
 await expect(box).toBeEnabled();
 await box.fill('Hola JARVIS, comprueba el envío');
 await page.getByRole('button',{name:'Enviar',exact:true}).last().click();
 await expect(page.locator('.jarvis-conversation .cerebro-chat-line.cerebro-chat-user').last()).toContainText('Hola JARVIS, comprueba el envío');
 await expect(page.locator('.jarvis-conversation .cerebro-chat-line.cerebro-chat-cerebro').first().last()).toContainText('Recibido. Soy JARVIS');
 await expect(box).toHaveValue('');
 expect(posts).toBe(1);
 expect(message).toBe('Hola JARVIS, comprueba el envío');
});

test('JARVIS dictation renders interim text immediately, then final result once',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.addInitScript(()=>{
  class MockSpeechRecognition{
   lang='es-ES';
   continuous=false;
   interimResults=false;
   maxAlternatives=3;
   onstart:((event:Event)=>void)|null=null;
   onresult:((event:unknown)=>void)|null=null;
   onerror:((event:unknown)=>void)|null=null;
   onend:((event:Event)=>void)|null=null;
   start(){
    this.onstart?.(new Event('start'));
    const result=(transcript:string,isFinal:boolean)=>({
     length:1,isFinal,0:{transcript,confidence:0.96}
    });
    this.onresult?.({results:{length:1,0:result('Hola Jar',false)}});
    window.setTimeout(()=>{
     this.onresult?.({results:{length:1,0:result('Hola JARVIS',true)}});
     this.onend?.(new Event('end'));
    },600);
   }
   stop(){this.onend?.(new Event('end'))}
   abort(){this.onend?.(new Event('end'))}
  }
  (window as typeof window & {SpeechRecognition?:unknown}).SpeechRecognition=MockSpeechRecognition;
 });
 await installIsolatedPreprod(page);
 await page.goto('/cerebro?section=jarvis');
 const box=page.getByRole('textbox',{name:'Mensaje para Jarvis'});
 await expect(box).toBeEnabled();
 await page.getByRole('button',{name:'Dictar'}).click();
 await expect(box).toHaveValue('Hola Jar');
 await expect(box).toHaveValue('Hola JARVIS',{timeout:4000});
 expect((await box.inputValue()).match(/Hola JARVIS/g)?.length).toBe(1);
});

test('JARVIS voice session sends transcript and invokes the browser TTS adapter',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.addInitScript(()=>{
  const global=window as typeof window & {SpeechRecognition?:unknown;__jarvisSpoken?:string[]};
  global.__jarvisSpoken=[];
  let spokenOnce=false;
  class StubRecognition{
   lang='es-ES';continuous=false;interimResults=false;maxAlternatives=5;
   onstart:((event:Event)=>void)|null=null;
   onresult:((event:unknown)=>void)|null=null;
   onerror:((event:unknown)=>void)|null=null;
   onend:((event:Event)=>void)|null=null;
   start(){
    this.onstart?.(new Event('start'));
   if(spokenOnce)return;
   spokenOnce=true;
    window.setTimeout(()=>{
     this.onresult?.({results:{
      length:1,0:{length:1,isFinal:true,0:{transcript:'Hola JARVIS',confidence:0.98}}
     }});
     this.onend?.(new Event('end'));
    },90);
   }
   stop(){this.onend?.(new Event('end'))}
   abort(){this.onend?.(new Event('end'))}
  }
  global.SpeechRecognition=StubRecognition;
  const mockVoice={name:'Microsoft Jorge',lang:'es-ES',localService:true,voiceURI:'qa-male-es',default:false} as SpeechSynthesisVoice;
  window.speechSynthesis.getVoices=()=>[mockVoice];
  const synth=window.speechSynthesis;
  synth.speak=(utterance:SpeechSynthesisUtterance)=>{
   global.__jarvisSpoken?.push(utterance.text);
   window.setTimeout(()=>{utterance.onend?.(new Event('end') as SpeechSynthesisEvent)},200);
  };
  synth.cancel=()=>{};
 });
 await installIsolatedPreprod(page);
 await page.route(`${SUPABASE_PROD}/functions/v1/cerebro-console-gateway-v0/chat`,async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   status:'OK',intent:'greeting',message:'Hola. Soy JARVIS. Estoy listo para ayudarte.',executed:false
  })});
 });
 await page.goto('/cerebro?section=jarvis');
 const button=page.getByRole('button',{name:'Conversación por voz'});
 await expect(button).toBeEnabled();
 await button.click();
 await expect(page.locator('.jarvis-conversation .cerebro-chat-line.cerebro-chat-user')).toContainText('Hola JARVIS');
 await expect(page.locator('.jarvis-conversation .cerebro-chat-line.cerebro-chat-cerebro').first()).toContainText('Soy JARVIS');
 await expect.poll(()=>page.evaluate(()=>(window as typeof window & {__jarvisSpoken?:string[]}).__jarvisSpoken?.join(' ')||'')).toContain('JARVIS');
});
