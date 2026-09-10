import {useLocation} from 'react-router-dom';
import OperationalRecordDetail from './OperationalRecordDetail';
import TaskLifecycleGuard from './TaskLifecycleGuard';
import TasacionLifecycleGuard from './TasacionLifecycleGuard';
import FirmaLifecycleGuard from './FirmaLifecycleGuard';

export default function OperationalRecordDetailGate(){
 const {pathname,search}=useLocation();
 const match=pathname.match(/^\/(tareas|documentacion|tasaciones|firmas)\/([^/]+)$/);
 const id=match?.[2]?decodeURIComponent(match[2]).toLowerCase():'';
 if(id==='nuevo'||id==='nueva')return null;
 if(match?.[1]==='documentacion'&&new URLSearchParams(search).get('preview')==='1')return null;
 return <><OperationalRecordDetail/>{match?.[1]==='tareas'&&<TaskLifecycleGuard/>}{match?.[1]==='tasaciones'&&<TasacionLifecycleGuard/>}{match?.[1]==='firmas'&&<FirmaLifecycleGuard/>}</>;
}
