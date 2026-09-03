import UniversalDocumentIntelligenceGuardV2 from './UniversalDocumentIntelligenceGuardV2';
import AudioTranscriptionGuard from './AudioTranscriptionGuard';

export default function IntelligentDocumentIngestionGuard(){
  return <>
    <UniversalDocumentIntelligenceGuardV2 />
    <AudioTranscriptionGuard />
  </>;
}
