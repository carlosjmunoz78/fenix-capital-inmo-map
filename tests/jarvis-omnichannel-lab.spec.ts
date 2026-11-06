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
 await expect(page.locator('.jarvis-omni-launch')).toContainText('Conectado');
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

test('CUT47 microphone check runs only on user click, never uploads audio and stops every track',async({page})=>{
 await page.evaluate(()=>{
  window.__jarvisAudioCalls=0;
  window.__jarvisAudioStops=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async constraints=>{
    window.__jarvisAudioCalls+=1;
    if(constraints.audio!==true||constraints.video!==false)throw Error('unsafe microphone constraints');
    return {getTracks:()=>[{kind:'audio',stop:()=>{window.__jarvisAudioStops+=1}}]};
   }
  }});
 });
 const panel=page.locator('.jarvis-omni-panel');
 await expect(panel.getByRole('button',{name:'Comprobar micrófono local de JARVIS'})).toBeVisible();
 expect(await page.evaluate(()=>window.__jarvisAudioCalls)).toBe(0);
 await panel.getByRole('button',{name:'Comprobar micrófono local de JARVIS'}).click();
 await expect(panel.getByText('Entrada de audio disponible')).toBeVisible();
 await expect(panel.getByText(/NO demuestra que JARVIS entienda dictados/)).toBeVisible();
 expect(await page.evaluate(()=>window.__jarvisAudioCalls)).toBe(1);
 expect(await page.evaluate(()=>window.__jarvisAudioStops)).toBe(1);
 await expect(page.locator('#accepted-message')).toHaveText('');
});

test('CUT47 microphone permission denied reports clearly without enabling gateway writes',async({page})=>{
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async()=>{throw new DOMException('Permission denied','NotAllowedError')}
  }});
 });
 const panel=page.locator('.jarvis-omni-panel');
 await panel.getByRole('button',{name:'Comprobar micrófono local de JARVIS'}).click();
 await expect(panel.getByText('Micrófono sin validar')).toBeVisible();
 await expect(panel.getByText('El navegador ha denegado el acceso al micrófono.')).toBeVisible();
 await expect(page.locator('#accepted-message')).toHaveText('');
});

test('CUT48 browser speech can be played only after click and owner confirms audibility',async({page})=>{
 await page.evaluate(()=>{
  window.__jarvisSpoken=[];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
   cancel:()=>{},
   getVoices:()=>[{name:'Microsoft Pablo',lang:'es-ES',localService:true}],
   speak:utterance=>{
    window.__jarvisSpoken.push({text:utterance.text,rate:utterance.rate,pitch:utterance.pitch,voice:utterance.voice?.name});
    setTimeout(()=>utterance.onend?.(),30);
   }
  }});
 });
 const panel=page.locator('.jarvis-omni-panel');
 await expect(panel.getByRole('button',{name:'Probar voz de salida JARVIS'})).toBeVisible();
 expect(await page.evaluate(()=>window.__jarvisSpoken.length)).toBe(0);
 await panel.getByRole('button',{name:'Probar voz de salida JARVIS'}).click();
 await expect(panel.getByText('El navegador terminó de sintetizar. ¿Ha oído claramente la frase?')).toBeVisible();
 const played=await page.evaluate(()=>window.__jarvisSpoken);
 expect(played).toHaveLength(1);
 expect(played[0].text).toContain('señor');
 expect(played[0].rate).toBe(1.1);
 expect(played[0].voice).toBe('Microsoft Pablo');
 await panel.getByRole('button',{name:'Sí, la he oído'}).click();
 await expect(panel.getByText(/Audio confirmado por usted/)).toBeVisible();
 await expect(page.locator('#accepted-message')).toHaveText('');
});

test('CUT48 browser speech recognition returns a visible draft only, never sends chat',async({page})=>{
 const panel=page.locator('.jarvis-omni-panel');
 await expect(panel.getByRole('button',{name:'Probar transcripción real JARVIS'})).toBeVisible();
 await panel.getByRole('button',{name:'Probar transcripción real JARVIS'}).click();
 await expect(panel.getByText(/Reconocimiento recibido, sin enviarlo/)).toBeVisible();
 await expect(panel.getByText(/mensaje dictado omnicanal/)).toBeVisible();
 await expect(page.locator('#accepted-message')).toHaveText('');
});
