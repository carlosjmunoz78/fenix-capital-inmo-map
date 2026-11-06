import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  class SyntheticRecognition{
   lang='es-ES';
   continuous=false;
   interimResults=false;
   maxAlternatives=1;
   onstart=null;onresult=null;onerror=null;onend=null;
   start(){
    this.onstart?.();
    setTimeout(()=>{
     this.onresult?.({results:[[{transcript:'texto dictado',confidence:0.99}]]});
     this.onend?.();
    },60);
   }
   stop(){this.onend?.()}
   abort(){this.onend?.()}
  }
  window.webkitSpeechRecognition=SyntheticRecognition;
 });
 await page.goto('/tests/jarvis-ui-lab-harness.html');
 await expect(page.getByRole('region',{name:'Hablar con Jarvis'})).toBeVisible();
});
test('JARVIS is always visibly present and sends typed messages via authenticated UI bridge',async({page})=>{
 await expect(page.locator('[data-jarvis-state="ready"]')).toBeVisible();
 await expect(page.getByText('JARVIS',{exact:true})).toBeVisible();
 const input=page.getByRole('textbox',{name:'Mensaje para Jarvis'});
 await input.fill('Hola, Jarvis');
 await input.press('Enter');
 await expect(page.locator('#accepted-message')).toHaveText('Hola, Jarvis');
 await expect(input).toHaveValue('');
 await expect(page.getByRole('button',{name:'Dictar'})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Conversación por voz'})).toBeEnabled();
});
test('offline draft remains editable, cannot be sent or start voice until connected',async({page})=>{
 await page.evaluate(()=>{
  const textarea=document.querySelector('.cerebro-chat-form textarea');
  textarea.disabled=true;
  document.querySelector('.cerebro-panel h2').textContent='Superficie preparada, conexión cerrada';
 });
 await expect(page.locator('[data-jarvis-state="offline"]')).toBeVisible();
 const input=page.getByRole('textbox',{name:'Mensaje para Jarvis'});
 await expect(input).toBeEnabled();
 await input.fill('Mensaje pendiente');
 await expect(page.getByRole('button',{name:'Enviar'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Conversación por voz'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Dictar'})).toBeEnabled();
 await page.evaluate(()=>{
  const textarea=document.querySelector('.cerebro-chat-form textarea');
  textarea.disabled=false;
  document.querySelector('.cerebro-panel h2').textContent='Transporte autenticado verificado';
 });
 await expect(page.locator('[data-jarvis-state="ready"]')).toBeVisible();
 await expect(input).toHaveValue('Mensaje pendiente');
 await page.getByRole('button',{name:'Enviar'}).click();
 await expect(page.locator('#accepted-message')).toHaveText('Mensaje pendiente');
});
test('dictation fills draft without unauthorized automatic send and voice is user initiated',async({page})=>{
 await page.getByRole('button',{name:'Dictar'}).click();
 const input=page.getByRole('textbox',{name:'Mensaje para Jarvis'});
 await expect(input).toHaveValue('texto dictado');
 await expect(page.locator('#accepted-message')).toHaveText('');
 await page.getByRole('button',{name:'Conversación por voz'}).click();
 await expect(page.locator('#voice-toggles')).toHaveText('on');
 await page.getByRole('button',{name:'Finalizar conversación por voz'}).click();
 await expect(page.locator('#voice-toggles')).toHaveText('off');
});
test('mobile composer remains within viewport and buttons are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const host=page.locator('.jarvis-operativa-composer-host');
 await expect(host).toBeVisible();
 const bb=await host.boundingBox();
 expect(bb).not.toBeNull();
 expect(bb.x).toBeGreaterThanOrEqual(-2);
 expect(bb.x+bb.width).toBeLessThanOrEqual(392);
 await expect(page.getByRole('button',{name:'Dictar'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Conversación por voz'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'Mensaje para Jarvis'})).toBeVisible();
});
