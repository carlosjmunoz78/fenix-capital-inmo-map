import {defineConfig} from 'vite';
import {fileURLToPath,URL} from 'node:url';

export default defineConfig({
  resolve:{
    alias:[
      {
        find:/^\.\/cerebroActivityApi$/,
        replacement:fileURLToPath(new URL('./qa/cerebroActivityApi.fixture.ts',import.meta.url))
      }
    ]
  }
});
