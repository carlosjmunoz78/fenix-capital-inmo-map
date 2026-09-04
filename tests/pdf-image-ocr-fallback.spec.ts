import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('PDF convertido desde imagen conserva fallback OCR por página',()=>{
 const src=fs.readFileSync(path.join(process.cwd(),'src/browserDocumentOcr.ts'),'utf8');
 expect(src).toContain("mime==='application/pdf'");
 expect(src).toContain('page.getTextContent()');
 expect(src).toContain('embedded.length>80');
 expect(src).toContain("page.getViewport({scale:1.8})");
 expect(src).toContain('page.render({canvasContext:ctx,viewport})');
 expect(src).toContain('await recognize(canvas)');
 expect(src).toContain("T.recognize(source,'spa')");
});

test('PDF sin capa de texto renderiza cada página y ejecuta OCR real del flujo',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const w=window as any;
  w.__ocrRenderPages=[];
  w.__ocrLanguages=[];
  w.pdfjsLib={
   GlobalWorkerOptions:{workerSrc:''},
   getDocument:()=>({promise:Promise.resolve({
    numPages:2,
    getPage:async(pageNumber:number)=>({
     getTextContent:async()=>({items:[]}),
     getViewport:()=>({width:240,height:320}),
     render:({canvasContext}:any)=>{
      canvasContext.canvas.dataset.ocrPage=String(pageNumber);
      w.__ocrRenderPages.push(pageNumber);
      return{promise:Promise.resolve()};
     }
    })
   })})
  };
  w.Tesseract={recognize:async(source:any,lang:string)=>{
   w.__ocrLanguages.push(lang);
   const pageNumber=source?.dataset?.ocrPage||'?';
   return{data:{text:`OCR-PAGE-${pageNumber}`,confidence:91}};
  }};
  const mod=await import('/src/browserDocumentOcr.ts');
  const file=new File([new Uint8Array([1,2,3])],'scan-convertido.pdf',{type:'application/pdf'});
  const out=await mod.ocrFile(file);
  return{text:out.text,confidence:out.confidence,renderPages:w.__ocrRenderPages,languages:w.__ocrLanguages};
 });
 expect(result.renderPages).toEqual([1,2]);
 expect(result.languages).toEqual(['spa','spa']);
 expect(result.text).toContain('OCR-PAGE-1');
 expect(result.text).toContain('OCR-PAGE-2');
 expect(result.confidence).toBe(91);
});
