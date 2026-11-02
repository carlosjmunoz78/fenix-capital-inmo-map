import {createFoundationEngine} from './foundation-runtime-v1.mjs';
export const engine=createFoundationEngine({engine_id:'NBA-001',name:'Next Best Action · Foundation Wrapper',mode:'NBA',preserve_existing:true}); export const manifest=engine.manifest; export const run=engine.run;
