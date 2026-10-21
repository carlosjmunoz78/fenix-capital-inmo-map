import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const QA_PATH='/cerebro-visual-qa.html';

async function assertConsole(page:Page,screenshotName:string){
  await page.goto(QA_PATH,{waitUntil:'networkidle'});
  await expect(page.getByText('QA VISUAL · DATOS SINTÉTICOS · PREPROD · NO PROD')).toBeVisible();
  await expect(page.getByRole('main',{name:'CEREBRO · Vista técnica'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'PROCESOS AHORA'})).toBeVisible();
  await expect(page.locator('[data-run-id="910001"]')).toBeVisible();
  await expect(page.locator('[data-run-id="910002"]')).toBeVisible();

  const viewSwitch=page.getByRole('navigation',{name:'Cambiar interfaz de CEREBRO'});
  const viewButtons=viewSwitch.locator('button');
  await expect(viewButtons).toHaveCount(3);
  await expect(viewButtons.nth(0)).toBeVisible();
  await expect(viewButtons.nth(1)).toBeVisible();
  const viewport=page.viewportSize();
  if((viewport?.width??1440)>760){
    await expect(viewButtons.nth(2)).toBeVisible();
    await expect(viewButtons.nth(2)).toBeDisabled();
  }else{
    await expect(viewButtons.nth(2)).toBeHidden();
  }

  const overflow=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width+1);

  await page.locator('[data-run-id="910001"]').click();
  const dialog=page.getByRole('dialog',{name:'Detalle de FACT-001'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Ejecutar pruebas estructurales')).toBeVisible();
  await expect(dialog.getByText('Generar evidencia de aceptación')).toBeVisible();
  await expect(dialog.getByText('PREPROD',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cerrar detalle'}).click();
  await expect(dialog).toBeHidden();

  mkdirSync('qa-artifacts/screenshots',{recursive:true});
  await page.screenshot({path:`qa-artifacts/screenshots/${screenshotName}`,fullPage:true});
}

test('desktop: technical console renders processes and inspector without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await assertConsole(page,'cerebro-console-v3-desktop.png');
});

test('mobile: technical console remains usable without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await assertConsole(page,'cerebro-console-v3-mobile.png');
});
