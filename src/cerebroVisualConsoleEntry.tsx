import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import CerebroVisualConsole from './CerebroVisualConsole';

const ROOT_ID='cerebro-visual-root';
let host=document.getElementById(ROOT_ID);
if(!host){
 host=document.createElement('div');
 host.id=ROOT_ID;
 document.body.appendChild(host);
}

ReactDOM.createRoot(host).render(
 <React.StrictMode>
  <BrowserRouter basename={import.meta.env.BASE_URL}>
   <CerebroVisualConsole/>
  </BrowserRouter>
 </React.StrictMode>
);
