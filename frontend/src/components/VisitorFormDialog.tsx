import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Camera, CheckCircle2, Loader2, Pencil } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import api from '../services/api';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

interface Visitor {
  id: string;
  name: string;
  document: string;
  phone?: string;
  photo?: string;
  consentGiven?: boolean;
  faceEmbedding?: number[] | null;
}

interface VisitorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorToEdit?: Partial<Visitor>;
  onSuccess?: (visitor: Visitor) => void;
  photoOnly?: boolean;
}

type FaceApiModule = typeof import('face-api.js');

const DEFAULT_VISITOR: Partial<Visitor> = {};

export function VisitorFormDialog({ 
  open, 
  onOpenChange, 
  visitorToEdit = DEFAULT_VISITOR, 
  onSuccess,
  photoOnly = false,
}: VisitorFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Visitor>>({});
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [embeddingFeedback, setEmbeddingFeedback] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<FaceApiModule | null>(null);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(visitorToEdit);
      setConsent(!!visitorToEdit.consentGiven);
      setFaceEmbedding(null);
      setEmbeddingStatus('idle');
      setEmbeddingFeedback(null);
      setPhotoChanged(false);
    }
    return () => stopCamera();
  }, [open, visitorToEdit]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsReady(true);
      } catch (err) {
        console.error('Não foi possível carregar modelos de face', err);
      }
    };
    loadModels();
  }, []);

  const attachStreamToVideo = (stream: MediaStream) => {
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // evita bloqueio de autoplay
        videoRef.current.play().catch(() => {});
      }
    });
  };

  const startCamera = async () => {
    try {
      // Garante que não há stream ativo para evitar erros de dispositivo em uso
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOpen(true);
      attachStreamToVideo(stream);
    } catch (err) {
      console.error('Erro ao acessar webcam', err);
      const errorName = err instanceof Error ? err.name : undefined;
      if (errorName === 'NotReadableError') {
        alert('A câmera já está sendo usada por outro aplicativo ou aba. Feche-o e tente novamente.');
      } else if (errorName === 'NotAllowedError') {
        alert('Permissão de câmera negada. Autorize o acesso à webcam e tente novamente.');
      } else {
        alert('Não foi possível acessar a webcam. Verifique as permissões ou tente novamente.');
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhotoChanged(true);
    setFormData((prev) => ({ ...prev, photo: dataUrl }));
    void generateEmbedding(dataUrl);
    stopCamera();
  };

  const generateEmbedding = async (dataUrl: string) => {
    setEmbeddingStatus('processing');
    setEmbeddingFeedback('Analisando a foto para gerar o reconhecimento facial...');

    try {
      if (!modelsReady || !faceapiRef.current) {
        setFaceEmbedding(null);
        setEmbeddingStatus('error');
        setEmbeddingFeedback('Os modelos faciais ainda estão carregando. Aguarde um instante e tente novamente.');
        return;
      }

      const faceapi = faceapiRef.current;
      const img = await faceapi.fetchImage(dataUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection?.descriptor) {
        setFaceEmbedding(Array.from(detection.descriptor));
        setEmbeddingStatus('success');
        setEmbeddingFeedback('Rosto identificado com sucesso. Esta foto pode ser usada no reconhecimento facial.');
        return;
      }

      setFaceEmbedding(null);
      setEmbeddingStatus('error');
      setEmbeddingFeedback('Nenhum rosto válido foi identificado na foto. Refaça a captura com o rosto centralizado e bem iluminado.');
    } catch (err) {
      setFaceEmbedding(null);
      setEmbeddingStatus('error');
      setEmbeddingFeedback('Não foi possível gerar o embedding facial desta foto. Tente novamente com outra captura.');
      console.error('Falha ao gerar embedding facial', err);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.id && !consent) {
        alert('É necessário aceitar os termos de privacidade para continuar.');
        return;
    }

    if (photoOnly && !photoChanged) {
      alert('Cadastre uma nova foto antes de salvar.');
      return;
    }

    if (photoOnly && embeddingStatus !== 'success') {
      alert('A nova foto precisa gerar o reconhecimento facial com sucesso antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      let response;
      const payload = {
        ...formData,
        consentGiven: consent,
        ...(faceEmbedding ? { faceEmbedding } : {}),
      };
      if (formData.id) {
        response = await api.put(`/visitors/${formData.id}`, payload);
      } else {
        response = await api.post('/visitors', payload);
      }
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      onOpenChange(false);
      setFormData({});
      setConsent(false);
    } catch (error) {
      console.error('Failed to save visitor', error);
      alert('Erro ao salvar visitante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {photoOnly ? 'Recadastrar Foto Facial' : formData.id ? 'Editar Visitante' : 'Novo Visitante'}
          </DialogTitle>
          <DialogDescription>
            {photoOnly
              ? 'Capture ou envie uma nova foto para atualizar o reconhecimento facial deste visitante.'
              : 'Preencha os dados do visitante.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {!photoOnly && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="document">Documento (CPF/RG)</Label>
                <Input
                  id="document"
                  value={formData.document || ''}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="photo">Foto</Label>
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center">
                <div 
                  className="relative h-32 w-32 rounded-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex items-center justify-center cursor-pointer overflow-hidden transition-all bg-muted/10 group"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  {formData.photo ? (
                    <img 
                      src={formData.photo} 
                      alt="Preview" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                      <Camera className="h-8 w-8" />
                      <span className="text-xs font-medium">Upload</span>
                    </div>
                  )}
                  
                  {formData.photo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Pencil className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  id="photo-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const photo = reader.result as string;
                      setPhotoChanged(true);
                      setFormData((prev) => ({ ...prev, photo }));
                      void generateEmbedding(photo);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              </div>

              <div className="w-full space-y-2">
                {cameraOpen ? (
                    <div className="space-y-2">
                  <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-md border"
                    />
                    <div className="flex gap-2">
                      <Button type="button" className="flex-1" onClick={capturePhoto}>Capturar</Button>
                      <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>Fechar câmera</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={startCamera}>
                    Abrir webcam USB
                  </Button>
                )}
              </div>

              {embeddingStatus !== 'idle' && embeddingFeedback && (
                <Alert
                  className={
                    embeddingStatus === 'success'
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : embeddingStatus === 'processing'
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                  }
                >
                  {embeddingStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : embeddingStatus === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <AlertDescription>{embeddingFeedback}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {!photoOnly && !formData.id && (
              <div className="flex items-start space-x-2 pt-2">
                  <Checkbox 
                      id="consent" 
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                      <Label
                          htmlFor="consent"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                          Li e aceito os termos de uso e privacidade
                      </Label>
                      <p className="text-xs text-muted-foreground">
                          Ao continuar, você concorda com nossa <Link to="/privacy" className="text-primary hover:underline" target="_blank">Política de Privacidade</Link> e o tratamento de seus dados pessoais para fins de controle de acesso.
                      </p>
                  </div>
              </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={saving || embeddingStatus === 'processing' || (photoOnly && !photoChanged)}
            >
              {saving
                ? 'Salvando...'
                : embeddingStatus === 'processing'
                  ? 'Processando foto...'
                  : photoOnly
                    ? 'Salvar Nova Foto'
                    : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

