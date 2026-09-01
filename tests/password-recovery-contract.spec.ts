import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('recuperación de contraseña usa enlace productivo y sesión recovery, no código OTP',()=>{
 const source=readFileSync('src/App.tsx','utf8');
 expect(source).toContain("event==='PASSWORD_RECOVERY'");
 expect(source).toContain("const redirectTo=`${window.location.origin}${import.meta.env.BASE_URL}`");
 expect(source).toContain('resetPasswordForEmail(email,{redirectTo})');
 expect(source).toContain("setResetMessage('Enlace de recuperación enviado.");
 expect(source).toContain('supabase.auth.updateUser({password:newPassword})');
 expect(source).not.toContain("verifyOtp({email,token,type:'recovery'})");
 expect(source).not.toContain('Código enviado.');
});
