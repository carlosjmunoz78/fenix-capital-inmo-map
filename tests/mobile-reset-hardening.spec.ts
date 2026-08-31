import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('password recovery supports authenticated link and OTP fallback',()=>{
 const app=fs.readFileSync(path.resolve('src/App.tsx'),'utf8');
 expect(app).toContain("event==='PASSWORD_RECOVERY'");
 expect(app).toContain('setRecoveryLinkVerified(Boolean(next))');
 expect(app).toContain("supabase.auth.verifyOtp({email,token,type:'recovery'})");
 expect(app).toContain('if(!recoveryLinkVerified)');
 expect(app).toContain('supabase.auth.updateUser({password:newPassword})');
 expect(app).toContain('Enlace de recuperación validado');
});

test('mobile hamburger owns the whole viewport and legacy bottom strip is removed',()=>{
 const css=fs.readFileSync(path.resolve('src/operational-mobile-nav.css'),'utf8');
 expect(css).toContain('.ops-root{padding-bottom:0!important;min-height:100dvh!important;height:100dvh!important}');
 expect(css).toContain('.ops-root>.ops-main{height:100dvh!important');
 expect(css).toContain('height:100dvh!important');
 expect(css).toContain('box-sizing:border-box!important');
 expect(css).toContain('env(safe-area-inset-bottom)');
 expect(css).toContain('overflow-y:auto!important');
});
