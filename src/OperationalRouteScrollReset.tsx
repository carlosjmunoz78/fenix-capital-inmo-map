import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function OperationalRouteScrollReset(){
 const {pathname,search}=useLocation();
 useEffect(()=>{
  const reset=()=>{
   const main=document.querySelector<HTMLElement>('.ops-root .ops-main');
   if(main)main.scrollTop=0;
   window.scrollTo({top:0,left:0,behavior:'auto'});
  };
  reset();
  const frame=requestAnimationFrame(reset);
  const timer=window.setTimeout(reset,0);
  return()=>{cancelAnimationFrame(frame);window.clearTimeout(timer)};
 },[pathname,search]);
 return null;
}
