import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  class MockSpeech{
   lang='es-ES';continuous=false;interimResults=false;maxAlternatives=1;
   onstart=null;onresult=null;onerror=null;onend=null;
   start(){this.onstart?.();setTimeout(()=>{
    this.onresult?.({results:[[{transcript:'mensaje dictado omnicanal',confidence:0.99}]]});
    this.onend?.();
   },75)}
   stop(){this.onend?.()}
   abort(){this.onend?.()}
  }
  window.SpeechRecognition=MockSpeech;window.webkitSpeechRecognition=MockSpeech;
 });
 await page.goto('/tests/jarvis-ui-lab-harness.html?omni=1');
 await expect(page.locator('.jarvis-omni-launch')).toBeVisible();
 await page.locator('.jarvis-omni-launch').click();
 await expect(page.getByRole('region',{name:'Conversación compartida'})).toBeVisible();
});
test('CUT39 same transcript is shown in three sibling interfaces',async({page})=>{
 await expect(page.getByText('Te escucho en todas las interfaces')).toBeVisible();
 await expect(page.locator('[data-jarvis-omni-interface="OPERATIVA"]')).toBeVisible();
 await page.locator('#switch-neuronal').evaluate(el=>el.click());
 await expect(page.locator('[data-jarvis-omni-interface="NEURONAL"]')).toBeVisible();
 await expect(page.getByText('Te escucho en todas las interfaces')).toBeVisible();
 await page.locator('#switch-browser').evaluate(el=>el.click());
 await expect(page.locator('[data-jarvis-omni-interface="NAVEGADOR"]')).toBeVisible();
 await expect(page.getByText('Te escucho en todas las interfaces')).toBeVisible();
});
test('CUT39 typed messages reach the same authenticated-event gateway mock',async({page})=>{
 const input=page.getByRole('textbox',{name:'Escribir a JARVIS'});
 await input.fill('Hola desde la interfaz Neuronal');
 await page.getByRole('button',{name:'Enviar a JARVIS'}).click();
 await expect(page.locator('#accepted-message')).toHaveText('Hola desde la interfaz Neuronal');
 await expect(input).toHaveValue('');
});
test('CUT39 draft remains when disconnected, and is not sent until gateway recovers',async({page})=>{
 await page.locator('#simulate-offline').evaluate(el=>el.click());
 await expect(page.getByRole('button',{name:'Enviar a JARVIS'})).toBeDisabled();
 await page.getByRole('textbox',{name:'Escribir a JARVIS'}).fill('No enviar si no hay gateway');
 await expect(page.getByRole('button',{name:'Enviar a JARVIS'})).toBeDisabled();
 await expect(page.locator('#accepted-message')).toHaveText('');
 await page.locator('#simulate-online').evaluate(el=>el.click());
 await expect(page.getByRole('button',{name:'Enviar a JARVIS'})).toBeEnabled();
 await page.getByRole('button',{name:'Enviar a JARVIS'}).click();
 await expect(page.locator('#accepted-message')).toHaveText('No enviar si no hay gateway');
});
test('CUT39 dictation is editable and voice uses original core only when clicked',async({page})=>{
 await page.getByRole('button',{name:'Dictar a JARVIS'}).click();
 await expect(page.getByRole('textbox',{name:'Escribir a JARVIS'})).toHaveValue('mensaje dictado omnicanal');
 await expect(page.locator('#accepted-message')).toHaveText('');
 await page.getByRole('button',{name:'Conversación por voz con JARVIS'}).click();
 await expect(page.locator('#voice-toggles')).toHaveText('on');
 await page.getByRole('button',{name:'Conversación por voz con JARVIS'}).click();
 await expect(page.locator('#voice-toggles')).toHaveText('off');
});
test('CUT39 panel fits mobile viewport without hiding existing main route',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const rect=await page.locator('.jarvis-omni-dock').boundingBox();
 expect(rect).not.toBeNull();
 expect(rect.x).toBeGreaterThanOrEqual(0);
 expect(rect.x+rect.width).toBeLessThanOrEqual(392);
 await expect(page.getByRole('textbox',{name:'Escribir a JARVIS'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Dictar a JARVIS'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Conversación por voz con JARVIS'})).toBeVisible();
});
