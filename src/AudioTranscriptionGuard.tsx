import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Copy, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './audio-transcription.css';

type RecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEventLike = { resultIndex: number; results: ArrayLike<RecognitionResultLike> };
type RecognitionErrorLike = { error?: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => RecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionCtor;
  webkitSpeechRecognition?: RecognitionCtor;
};

function recognitionConstructor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export default function AudioTranscriptionGuard() {
  const location = useLocation();
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [message, setMessage] = useState('');
  const supported = Boolean(recognitionConstructor());

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterimText('');
  }, [location.pathname]);

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function start() {
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setMessage('Este navegador no ofrece dictado por voz compatible. Puedes seguir escribiendo o pegar texto manualmente.');
      setOpen(true);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let finalChunk = '';
      let interimChunk = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || '';
        if (result?.isFinal) finalChunk += `${transcript} `;
        else interimChunk += transcript;
      }
      if (finalChunk) setFinalText(current => `${current}${finalChunk}`.replace(/\s+/g, ' ').trimStart());
      setInterimText(interimChunk);
    };
    recognition.onerror = event => {
      const error = event?.error || 'unknown';
      const friendly = error === 'not-allowed'
        ? 'No hay permiso para usar el micrófono. Actívalo en el navegador y vuelve a intentarlo.'
        : error === 'no-speech'
          ? 'No se ha detectado voz. Vuelve a intentarlo cuando estés preparado.'
          : 'El dictado se ha interrumpido. Puedes reanudarlo sin perder el texto.';
      setMessage(friendly);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setMessage('');
    setOpen(true);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMessage('No se pudo iniciar el dictado. Espera un instante y vuelve a intentarlo.');
      setListening(false);
    }
  }

  async function copyText() {
    const text = `${finalText}${interimText ? ` ${interimText}` : ''}`.trim();
    if (!text) {
      setMessage('Aún no hay texto para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Texto copiado. Puedes pegarlo donde lo necesites.');
    } catch {
      setMessage('No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.');
    }
  }

  function close() {
    stop();
    setOpen(false);
  }

  return <div className="fenix-audio-transcription" data-testid="audio-transcription-guard">
    {!open && <button
      type="button"
      className="fenix-audio-launcher"
      onClick={start}
      aria-label="Dictar texto con voz"
      title="Dictar texto con voz"
    ><Mic size={19}/><span>Dictar</span></button>}

    {open && <section className="fenix-audio-panel" aria-label="Dictado por voz">
      <header>
        <div><strong>Voz → texto</strong><span>{listening ? 'Escuchando en español…' : 'Dictado preparado'}</span></div>
        <button type="button" className="fenix-audio-icon" onClick={close} aria-label="Cerrar dictado"><X size={18}/></button>
      </header>

      <textarea
        aria-label="Texto transcrito"
        value={`${finalText}${interimText ? ` ${interimText}` : ''}`}
        onChange={event => { setFinalText(event.target.value); setInterimText(''); }}
        placeholder="Tu transcripción aparecerá aquí. Puedes editarla antes de usarla."
      />

      {message && <p className="fenix-audio-message" role="status">{message}</p>}
      {!supported && !message && <p className="fenix-audio-message" role="status">Dictado automático no disponible en este navegador.</p>}

      <footer>
        <button type="button" className={listening ? 'danger' : 'primary'} onClick={listening ? stop : start}>
          {listening ? <><MicOff size={17}/>Parar</> : <><Mic size={17}/>Dictar</>}
        </button>
        <button type="button" className="secondary" onClick={copyText}><Copy size={17}/>Copiar texto</button>
        <button type="button" className="secondary" onClick={() => { setFinalText(''); setInterimText(''); setMessage(''); }}>Limpiar</button>
      </footer>
      <small>El dictado no modifica expedientes, contactos ni otros registros automáticamente.</small>
    </section>}
  </div>;
}
