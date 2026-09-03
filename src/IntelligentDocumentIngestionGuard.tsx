import UniversalDocumentIntelligenceGuardV2 from './UniversalDocumentIntelligenceGuardV2';
import AudioTranscriptionGuard from './AudioTranscriptionGuard';
import HistoricalDocumentRecoveryGuard from './HistoricalDocumentRecoveryGuard';
import HistoricalDocumentRecoveryPlacementFix from './HistoricalDocumentRecoveryPlacementFix';

export default function IntelligentDocumentIngestionGuard(){
  return <>
    <UniversalDocumentIntelligenceGuardV2 />
    <AudioTranscriptionGuard />
    <HistoricalDocumentRecoveryGuard />
    <HistoricalDocumentRecoveryPlacementFix />
  </>;
}
