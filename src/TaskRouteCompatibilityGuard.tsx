import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';

export default function TaskRouteCompatibilityGuard(){
 const location=useLocation(),navigate=useNavigate();
 useEffect(()=>{
  const match=location.pathname.match(/^\/tareas\/([^/]+)$/);
  if(!match||match[1]==='nueva'||match[1]==='nuevo')return;
  navigate(`/agenda/tarea/${match[1]}`,{replace:true});
 },[location.pathname,navigate]);
 return null;
}
