import {JarvisMemoryV1} from './memory-v1.mjs';
export class JarvisWorldModelAccessV1{
 constructor({memory=new JarvisMemoryV1()}={}){this.memory=memory;}
 snapshot({company_id,project_id='default',limit=200}={}){const memories=this.memory.list({company_id,project_id,limit});return Object.freeze({schema_version:'1.0',state_type:'JARVIS_WORLD_MODEL_SNAPSHOT',company_id,project_id,observed_at:new Date().toISOString(),memory_count:memories.length,memories:Object.freeze(memories)});}
}
