import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';

type ViewName='OPERATIVA'|'NAVEGADOR';
type Props={onViewChange:(view:ViewName)=>void};

export default function CerebroOperativaConsole({onViewChange}:Props){
 return <CerebroJarvisWorkConsole surface="OPERATIVA" onViewChange={onViewChange}/>;
}
