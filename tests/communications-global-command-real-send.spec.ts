import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('Ana routes communications from the universal voice hub and preserves context',()=>{
 const src=fs.readFileSync('src/GlobalCommunicationCommandGuard.tsx','utf8');
 expect(src).toContain('Hablar con Ana');
 expect(src).toContain('Tarea');
 expect(src).toContain("navigate(`/comunicaciones/nueva?");
 expect(src).toContain("scope_type");
 expect(src).toContain("scope_code");
 expect(src).toContain("instruction");
});

test('communications UI resolves canonical bank contacts and never silently invents a destination',()=>{
 const src=fs.readFileSync('src/CommunicationsShell.tsx','utf8');
 expect(src).toContain("fetchNotionRuntime<unknown>('/contactos-bancarios')");
 expect(src).toContain('No he encontrado un único destinatario');
 expect(src).toContain('No se inventa ningún dato');
 expect(src).toContain('Interpretar orden y localizar destinatario');
});

test('real send is a separate explicitly confirmed transition',()=>{
 const src=fs.readFileSync('src/CommunicationsShell.tsx','utf8');
 expect(src).toContain("kind:'authorize'|'simulate'|'real'");
 expect(src).toContain("mode:'REAL'");
 expect(src).toContain('Revisar envío real');
 expect(src).toContain('Mandar ahora');
 expect(src).toContain('SE ENVIARÁ realmente');
 expect(src).toContain("mode:'SIMULATED'");
});

test('WhatsApp consent is explicit and defaults false',()=>{
 const src=fs.readFileSync('src/CommunicationsShell.tsx','utf8');
 expect(src).toContain('const[whatsappConsent,setWhatsappConsent]=useState(false)');
 expect(src).toContain("canal==='WhatsApp'&&!whatsappConsent");
 expect(src).toContain('nunca viene marcada por defecto');
 expect(src).not.toContain('setWhatsappConsent(true)');
});
