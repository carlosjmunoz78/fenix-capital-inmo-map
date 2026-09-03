import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('ficha de contacto normaliza una sola cabecera de contenido antes de Ana',()=>{
 const src=fs.readFileSync('src/OperationalUniformityGuard.tsx','utf8');
 expect(src).toContain("/^\\/contactos\\/[^/]+$/.test(path)");
 expect(src).toContain("content?.querySelector(':scope > .contact-detail-title')");
 expect(src).toContain("content?.querySelector(':scope > .contact-detail-ana')");
 expect(src).toContain('content.insertBefore(title,ana)');
 expect(src).toContain("root.querySelectorAll('.ops-main > .ops-top')");
});

test('notaría, registro y perfil nunca muestran dos correcciones de Ana',()=>{
 const src=fs.readFileSync('src/OperationalUniformityGuard.tsx','utf8');
 expect(src).toContain("path==='/perfil'||/^\\/notarias\\/[^/]+$/.test(path)||/^\\/registros-propiedad\\/[^/]+$/.test(path)");
 expect(src).toContain("el.classList.contains('ana-top-correction')||el.classList.contains('profile-correct')");
 expect(src).toContain("if(candidates.length>1)");
 expect(src).toContain("el.classList.add(VISUAL_DEDUP_CLASS)");
 expect(src).toContain(`.${'${VISUAL_DEDUP_CLASS}'}{display:none!important}`);
});
