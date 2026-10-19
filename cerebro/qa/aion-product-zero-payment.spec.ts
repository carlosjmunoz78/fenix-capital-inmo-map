import {expect,test,type Page,type Response} from '@playwright/test';

const allowed=['AION-P001','AION-P002','AION-P003','AION-B005','AION-B008'] as const;
const product=(process.env.QA_PRODUCT_ID||'AION-P001').toUpperCase();
if(!allowed.includes(product as (typeof allowed)[number])) throw new Error(`QA_PRODUCT_ID not allowed: ${product}`);
const pageUrl=process.env.QA_PRODUCT_URL||'https://aionoperator.com/aion-prueba-cliente-0-preprod/';
const normalized=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
async function resilientGoto(page:Page,url:string):Promise<Response|null>{let lastError:unknown;for(let attempt=1;attempt<=3;attempt++){try{const response=await page.goto(url,{waitUntil:'commit',timeout:25_000});if(response&&response.status()>=500)throw new Error(`HTTP_${response.status()}`);return response}catch(error){lastError=error;if(attempt===3)break;await page.waitForTimeout(attempt*1_500)}}throw lastError instanceof Error?lastError:new Error(String(lastError))}

test(`[PRODUCT] [AION_DEEP_ZERO_PAYMENT] ${product} · purchase → generate → deliver → private result`,async({page})=>{
  test.setTimeout(150_000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await resilientGoto(page,pageUrl);expect(response).not.toBeNull();if(response)expect(response.status()).toBeLessThan(500);
  const zeroTest=page.locator('#aion-zero-test');await expect(zeroTest).toBeVisible({timeout:45_000});
  const simulatorCopy=normalized(await zeroTest.innerText());expect(simulatorCopy).toContain('preprod');expect(simulatorCopy).toContain('0 €');expect(simulatorCopy).toContain('nunca cuenta como venta');expect(simulatorCopy).toContain('no existe cobro real');
  const button=page.locator(`[data-product="${product}"]`);await expect(button).toBeVisible();await page.waitForTimeout(1_100);await button.click();
  const status=page.locator('#zt-status');await expect(status).toContainText('Prueba completada',{timeout:60_000});await expect(status).toContainText('Importe real: 0 €');await expect(status).toContainText('Email: enviado');
  const access=status.locator('a[href]').first();await expect(access).toBeVisible();const accessUrl=await access.getAttribute('href');expect(accessUrl).toBeTruthy();const accessParsed=new URL(accessUrl!,pageUrl);expect(accessParsed.searchParams.get('aion_test_result')).toMatch(/^[a-f0-9-]{36}$/i);expect(accessParsed.searchParams.get('token')).toBeTruthy();
  const result=await resilientGoto(page,accessUrl!);expect(result).not.toBeNull();if(result)expect(result.status()).toBe(200);const resultBody=page.locator('body');await expect(resultBody).toBeVisible({timeout:30_000});const resultCopy=normalized(await resultBody.innerText());
  if(product==='AION-P001'){
    // P001, like P002, has a clean customer renderer. PREPROD + zero-charge was
    // already proven on the dedicated simulator before entering this private result.
    await expect(resultBody).toContainText('ANÁLISIS COMPLETADO');
    await expect(resultBody).toContainText('Tu análisis y documentos');
    await expect(resultBody).toContainText('Tu acceso');
    expect(resultCopy).not.toContain('preprod');expect(resultCopy).not.toContain('prueba cliente');expect(resultCopy).not.toContain('0 €');
  }else if(product==='AION-P002'){
    await expect(resultBody).toContainText('PROCEDIMIENTO COMPLETADO');await expect(resultBody).toContainText('Tu procedimiento y documentos');await expect(resultBody).toContainText('Tu acceso');expect(resultCopy).not.toContain('preprod');expect(resultCopy).not.toContain('prueba cliente');expect(resultCopy).not.toContain('0 €');
  }else{
    await expect(resultBody).toContainText('PRUEBA CLIENTE · 0 €');expect(resultCopy).toContain('preprod');expect(resultCopy).toContain('0 €');expect(resultCopy).toContain('no es venta real');
  }
  const artifactLinks=page.locator('a[href*="aion_test_view"],a[href*="aion_test_download"]');expect(await artifactLinks.count(),'generated delivery artifacts').toBeGreaterThan(0);const artifactUrl=await artifactLinks.first().getAttribute('href');expect(artifactUrl).toBeTruthy();const artifact=await page.request.get(artifactUrl!);expect(artifact.status(),'private artifact HTTP status').toBe(200);expect((await artifact.body()).byteLength,'private artifact non-empty').toBeGreaterThan(20);expect(errors,'uncaught browser errors').toEqual([]);
});
