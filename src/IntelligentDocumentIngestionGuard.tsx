import UniversalDocumentIntelligenceGuardV2 from './UniversalDocumentIntelligenceGuardV2';
import AudioTranscriptionGuard from './AudioTranscriptionGuard';
import HistoricalDocumentRecoveryFixedGuard from './HistoricalDocumentRecoveryFixedGuard';

export default function IntelligentDocumentIngestionGuard(){
  return <>
    <UniversalDocumentIntelligenceGuardV2 />
    <AudioTranscriptionGuard />
    <HistoricalDocumentRecoveryFixedGuard />
  </>;
}
