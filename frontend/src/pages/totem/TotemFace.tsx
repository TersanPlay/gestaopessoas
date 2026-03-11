import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TotemLayout } from './TotemLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '@/services/api';

// CDN oficial do face-api.js com pesos públicos
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function TotemFace() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'detecting' | 'success' | 'fail'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      setStatus('loading');
      try {
        const faceapi = await import('face-api.js');
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsReady(true);
        setStatus('idle');
      } catch (err) {
        console.error('Falha ao carregar modelos', err);
        setError('Erro ao carregar modelos de reconhecimento. Tente novamente.');
        setStatus('fail');
      }
    };
    loadModels();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (!modelsReady) return;
    try {
      stopCamera();
      setError(null);
      setStatus('detecting');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      // Delay to allow camera to settle
      setTimeout(runDetection, 400);
    } catch (err: any) {
      console.error('Erro ao acessar câmera', err);
      setError('Não foi possível acessar a câmera. Verifique permissões ou se outro app está usando.');
      setStatus('fail');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  };

  const runDetection = async () => {
    try {
      const faceapi = faceapiRef.current || (await import('face-api.js'));
      const video = videoRef.current;
      if (!video) return;
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection?.descriptor) {
        const photo = captureFrame();
        const descriptor = Array.from(detection.descriptor);

        try {
          const response = await api.post('/totem/face-match', { descriptor });
          if (response.data?.matched) {
            setStatus('success');
            stopCamera();
            return navigate('/totem/visitor-data', { state: { visitor: response.data.visitor, faceVerified: true, facePhoto: photo } });
          }
        } catch (matchErr) {
          console.error('Erro no face-match', matchErr);
        }

        // Sem match: segue para CPF com a foto capturada
        setStatus('fail');
        stopCamera();
        navigate('/totem/identify', { state: { faceVerified: false, photo } });
        return;
      }

      handleFail();
    } catch (err) {
      console.error('Erro na detecção facial', err);
      handleFail('Não foi possível detectar rosto. Tente novamente.');
    }
  };

  const handleFail = (customMessage?: string) => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setStatus('fail');
    setError(customMessage || 'Não foi detectado um rosto. Ajuste sua posição ou iluminação.');
    if (nextAttempts < 3) {
      setTimeout(startCamera, 1200);
    } else {
      stopCamera();
    }
  };

  return (
    <TotemLayout>
      <div className="flex flex-col h-full items-center justify-center p-6 gap-6 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-800">Reconhecimento Facial</h2>
          <p className="text-lg text-gray-500">Posicione o rosto na área da câmera. Se falhar 3x, digite o CPF.</p>
        </div>

        <div className="bg-white border rounded-2xl shadow-md p-6 w-full">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/80 flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline />
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 h-14 text-lg"
              onClick={startCamera}
              disabled={status === 'detecting' || !modelsReady}
            >
              <Camera className="mr-2 h-5 w-5" />
              Iniciar câmera
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-14 text-lg"
              onClick={() => navigate('/totem/identify')}
            >
              Digitar CPF
            </Button>
          </div>

          {status === 'success' && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-700">
                Rosto verificado! Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {attempts >= 3 && status === 'fail' && (
            <p className="mt-3 text-center text-sm text-gray-500">
              Muitas tentativas. Continue digitando o CPF.
            </p>
          )}
        </div>
      </div>
    </TotemLayout>
  );
}
