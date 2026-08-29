import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-mobile-shell-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{full_name:'Elena Ruiz'},created_at:'2026-08-19T00:00:00.000Z'}
};

test('shell operativo mantiene drawer autorizado, tema y calculadora utilizables en móvil',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('mobile'))test.skip();
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Agenda',route:'/agenda'}]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.goto('/expedientes');
 const shell=page.locator('.ops-root');
 await expect(shell).toBeVisible();
 const menu=shell.getByRole('button',{name:'Abrir menú'});
 await expect(menu).toBeVisible();
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await menu.click();
 await expect(shell).toHaveAttribute('data-mobile-nav','open');
 const drawer=page.getByRole('dialog',{name:'Navegación principal'});
 await expect(drawer).toBeVisible();
 const nav=drawer.locator('nav');
 await expect(nav.getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
 await expect(nav.getByRole('button',{name:'Bancos',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(shell).toHaveAttribute('data-mobile-nav','closed');
 await expect(menu).toBeFocused();
 await menu.click();
 await page.getByRole('button',{name:'Cerrar menú'}).last().click();
 await expect(shell).toHaveAttribute('data-mobile-nav','closed');
 await menu.click();
 await nav.getByRole('button',{name:'Bancos',exact:true}).click();
 await expect(page).toHaveURL(/\/bancos$/);
 await expect(page.locator('.ops-root')).toHaveAttribute('data-mobile-nav','closed');
 await page.locator('.ops-root').getByRole('button',{name:'Cambiar tema'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.getByRole('region',{name:'Calculadora Hipotecaria'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Calculadora'})).toBeVisible();
 await page.getByRole('button',{name:'Calculadora'}).click();
 await expect(page.getByRole('region',{name:'Calculadora Hipotecaria'})).toBeVisible();
});
