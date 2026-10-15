import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('PROD expediente journey keeps phase labels readable and save state visible',()=>{
 const css=fs.readFileSync('src/expediente-manual-phase.css','utf8');
 expect(css).toContain('grid-template-columns:repeat(10,minmax(0,1fr))');
 expect(css).not.toContain('min-width:760px');
 expect(css).toContain('.detail-journey.manual-phase-enabled .detail-phase-track>div>small');
 expect(css).toContain('.detail-journey.manual-phase-enabled .detail-phase-track>div.current>small{color:#f4741f');
 expect(css).toContain('.manual-phase-save:disabled{background:rgba(244,116,31,.1);color:#625b57');
 expect(css).toContain(".ops-root[data-theme='dark'] .manual-phase-save:disabled{color:#d7d0cc");
 expect(css).toContain('@media(max-width:900px)');
 expect(css).toContain('.detail-journey.manual-phase-enabled{grid-template-columns:minmax(0,1fr)}');
 expect(css).toContain('.manual-phase-save{width:100%}');
});
