import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('perfil permite cambiar solo la contraseña de la cuenta autenticada sin persistir secretos',()=>{
 const source=readFileSync('src/ProfileShell.tsx','utf8');
 expect(source).toContain("supabase.auth.updateUser({password:newPassword})");
 expect(source).toContain('Cambiar mi contraseña');
 expect(source).toContain('La contraseña nunca se registra en el Diario ni en ningún informe.');
 expect(source).toContain("if(newPassword.length<8)");
 expect(source).toContain("if(newPassword!==confirmPassword)");
 expect(source).not.toContain('localStorage.setItem(`password');
 expect(source).not.toContain('sessionStorage.setItem(`password');
 expect(source).not.toContain('fetchAppApi(\'/password\'');
});
