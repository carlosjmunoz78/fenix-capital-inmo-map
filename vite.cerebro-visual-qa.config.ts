import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {fileURLToPath,URL} from 'node:url';

export default defineConfig({
  plugins:[react()],
  resolve:{
    alias:[
      {
        find:/^\.\/cerebroActivityApi$/,
        replacement:fileURLToPath(new URL('./qa/cerebroActivityApi.fixture.ts',import.meta.url))
      }
    ]
  }
});
