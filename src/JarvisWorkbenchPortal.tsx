import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import JarvisWorkTools from './JarvisWorkTools';
import './jarvis-workbench-portal.css';
import './jarvis-repo-git.css';

export default function JarvisWorkbenchPortal(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  let current:HTMLElement|null=null;
  const sync=()=>{
   const next=document.querySelector<HTMLElement>('.jarvis-work .jarvis-tool-grid');
   if(next===current)return;
   if(current)current.classList.remove('is-repo-workbench');
   current=next;
   if(current)current.classList.add('is-repo-workbench');
   setTarget(current);
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{subtree:true,childList:true});
  return()=>{observer.disconnect();if(current)current.classList.remove('is-repo-workbench')};
 },[]);
 if(!target)return null;
 return createPortal(<div className="jarvis-repo-workbench-host"><JarvisWorkTools/></div>,target);
}
