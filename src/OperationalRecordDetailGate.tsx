import {useLocation} from 'react-router-dom';
import OperationalRecordDetail from './OperationalRecordDetail';

export default function OperationalRecordDetailGate(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/(tareas|documentacion|tasaciones|firmas)\/([^/]+)$/);
 const id=match?.[2]?decodeURIComponent(match[2]).toLowerCase():'';
 if(id==='nuevo'||id==='nueva')return null;
 return <OperationalRecordDetail/>;
}
