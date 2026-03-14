import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Activity,
  Bike,
  Building2,
  Camera,
  CarFront,
  History,
  Link2,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/services/api';
import {
  guardhouseApi,
  type GuardhouseMovement,
  type GuardhouseVehicle,
  type GuardhouseVehicleUpdatePayload,
  type SpotType,
  type VehicleCategory,
} from '@/services/guardhouseApi';

type VehicleDetails = GuardhouseVehicle & {
  blocks: Array<{
    id: string;
    reason: string;
    startAt: string;
    endAt: string | null;
    isActive: boolean;
  }>;
  movements: GuardhouseMovement[];
};

type CaptureMode = 'file' | 'webcam' | 'network';
type DepartmentOption = { id: string; name: string };
type VehicleTypeOption = 'CAR' | 'MOTORCYCLE' | 'PICKUP' | 'VAN';
type VehicleEditForm = {
  plate: string;
  vehicleType: VehicleTypeOption;
  category: VehicleCategory;
  destinationDepartmentId: string;
  driverName: string;
  brand: string;
  model: string;
  color: string;
  notes: string;
};

const categoryLabel: Record<GuardhouseVehicle['category'], string> = {
  OFFICIAL: 'Oficial',
  EMPLOYEE: 'Servidor',
  VISITOR: 'Visitante',
  CONTRACTOR: 'Contratado',
};

type ColorOption = {
  value: string;
  kind: 'solid' | 'gradient';
  solid?: string;
  gradient?: string;
};

const VEHICLE_TYPE_TO_API: Record<VehicleTypeOption, SpotType> = {
  CAR: 'CAR',
  MOTORCYCLE: 'MOTORCYCLE',
  PICKUP: 'CAR',
  VAN: 'CAR',
};

const COLOR_OPTIONS = [
  { value: 'Branco', kind: 'solid', solid: '#F8FAFC' },
  { value: 'Preto', kind: 'solid', solid: '#111827' },
  { value: 'Prata', kind: 'solid', solid: '#9CA3AF' },
  { value: 'Cinza', kind: 'solid', solid: '#6B7280' },
  { value: 'Vermelho', kind: 'solid', solid: '#DC2626' },
  { value: 'Azul', kind: 'solid', solid: '#2563EB' },
  { value: 'Verde', kind: 'solid', solid: '#16A34A' },
  { value: 'Amarelo', kind: 'solid', solid: '#EAB308' },
  { value: 'Bege', kind: 'solid', solid: '#D6C7A1' },
  { value: 'Marrom', kind: 'solid', solid: '#92400E' },
  { value: 'Laranja', kind: 'solid', solid: '#EA580C' },
  { value: 'Grena', kind: 'solid', solid: '#7F1D1D' },
  { value: 'Rosa', kind: 'solid', solid: '#EC4899' },
  { value: 'Roxa', kind: 'solid', solid: '#7C3AED' },
  { value: 'Fantasia', kind: 'gradient', gradient: 'linear-gradient(135deg, #2563EB, #EC4899, #F59E0B)' },
] as const satisfies readonly ColorOption[];

const getColorSwatchStyle = (color: ColorOption): CSSProperties =>
  color.kind === 'gradient' ? { backgroundImage: color.gradient } : { backgroundColor: color.solid };

const movementStatusLabel: Record<GuardhouseMovement['status'], string> = {
  PRESENT: 'Presente',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatDuration = (minutes: number | null, entryAt: string, exitAt: string | null) => {
  const totalMinutes =
    minutes ??
    (exitAt
      ? Math.max(1, Math.round((new Date(exitAt).getTime() - new Date(entryAt).getTime()) / (1000 * 60)))
      : null);

  if (!totalMinutes) {
    return '-';
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
};

const resolvePhotoUrl = (photoPath: string | null): string | null => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
  const normalized = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `http://localhost:3000${normalized}`;
};

const detectExtensionByMime = (mimeType: string): string => {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.jpg';
};

const BRAZIL_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const normalizePlate = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const isValidBrazilPlate = (value: string): boolean => BRAZIL_PLATE_REGEX.test(value);

const GuardhouseVehicleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [editForm, setEditForm] = useState<VehicleEditForm>({
    plate: '',
    vehicleType: 'CAR',
    category: 'VISITOR',
    destinationDepartmentId: '',
    driverName: '',
    brand: '',
    model: '',
    color: '',
    notes: '',
  });
  const [networkImageUrl, setNetworkImageUrl] = useState('');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('file');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('default');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canEditVehicle = user?.role === 'ADMIN' || user?.role === 'RECEPCIONISTA';

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
  }, []);

  const loadCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === 'videoinput');
    const selectableVideoInputs = videoInputs.filter(
      (device) => typeof device.deviceId === 'string' && device.deviceId.trim().length > 0,
    );

    setCameraDevices(selectableVideoInputs);

    if (selectableVideoInputs.length > 0) {
      setSelectedCameraId((current) =>
        current && current !== 'default' ? current : selectableVideoInputs[0].deviceId,
      );
    } else {
      setSelectedCameraId('default');
    }
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await guardhouseApi.getVehicleById(id);
        setVehicle(data);
      } catch (error) {
        console.error('Failed to load guardhouse vehicle details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    loadCameraDevices().catch(() => undefined);
  }, [id, loadCameraDevices]);

  useEffect(() => {
    if (!canEditVehicle) {
      setDepartmentsLoading(false);
      return;
    }

    let active = true;
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        if (!active) return;
        setDepartments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch departments for vehicle details', error);
      } finally {
        if (active) {
          setDepartmentsLoading(false);
        }
      }
    };

    void fetchDepartments();

    return () => {
      active = false;
    };
  }, [canEditVehicle]);

  useEffect(() => {
    if (!isEditing || !vehicle || departments.length === 0) return;

    setEditForm((current) => {
      if (current.destinationDepartmentId) return current;

      const detectedDepartmentId =
        departments.find((department) => department.name === (vehicle.sourceAgency ?? ''))?.id ?? '';

      return { ...current, destinationDepartmentId: detectedDepartmentId };
    });
  }, [departments, isEditing, vehicle]);

  useEffect(() => {
    if (captureMode !== 'webcam') {
      stopCamera();
    }
  }, [captureMode, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const latestMovement = useMemo(() => vehicle?.movements?.[0] ?? null, [vehicle]);
  const photoUrl = useMemo(() => resolvePhotoUrl(vehicle?.photo ?? null), [vehicle?.photo]);

  const placeholderConfig = useMemo(() => {
    if (vehicle?.vehicleType === 'MOTORCYCLE') {
      return {
        title: 'Sem foto de moto',
        subtitle: 'Use arquivo, webcam USB ou camera em rede.',
        Icon: Bike,
        surface: 'from-amber-100 to-orange-50 border-amber-200',
        icon: 'text-amber-600',
      };
    }

    return {
      title: 'Sem foto de carro',
      subtitle: 'Use arquivo, webcam USB ou camera em rede.',
      Icon: CarFront,
      surface: 'from-sky-100 to-indigo-50 border-sky-200',
      icon: 'text-sky-700',
    };
  }, [vehicle?.vehicleType]);

  const canManagePhoto = canEditVehicle;
  const displayedEntryNotes = vehicle?.notes ?? latestMovement?.entryNotes ?? '';
  const selectedEditColor = COLOR_OPTIONS.find((color) => color.value === editForm.color);

  const fillEditForm = useCallback(
    (currentVehicle: VehicleDetails) => {
      const departmentId =
        departments.find((department) => department.name === (currentVehicle.sourceAgency ?? ''))?.id ?? '';

      setEditForm({
        plate: currentVehicle.plate,
        vehicleType: currentVehicle.vehicleType,
        category: currentVehicle.category,
        destinationDepartmentId: departmentId,
        driverName: currentVehicle.movements?.[0]?.driver?.fullName ?? '',
        brand: currentVehicle.brand ?? '',
        model: currentVehicle.model ?? '',
        color: currentVehicle.color ?? '',
        notes: currentVehicle.notes ?? currentVehicle.movements?.[0]?.entryNotes ?? '',
      });
    },
    [departments],
  );

  const startEditMode = useCallback(() => {
    if (!vehicle) return;
    fillEditForm(vehicle);
    setIsEditing(true);
  }, [fillEditForm, vehicle]);

  const cancelEditMode = useCallback(() => {
    setIsEditing(false);
  }, []);

  const uploadPhotoFile = useCallback(
    async (file: File) => {
      if (!id) return;

      setUploading(true);
      try {
        const updatedVehicle = await guardhouseApi.uploadVehiclePhoto(id, file);
        setVehicle((current) => (current ? { ...current, photo: updatedVehicle.photo } : current));
        setImageError(false);
      } catch (error) {
        console.error('Failed to upload vehicle photo', error);
        alert('Nao foi possivel enviar a foto do veiculo.');
      } finally {
        setUploading(false);
      }
    },
    [id],
  );

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadPhotoFile(file);
    event.target.value = '';
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador nao suporta captura por webcam.');
      return;
    }

    try {
      setCameraError(null);
      stopCamera();

      const constraints: MediaStreamConstraints =
        selectedCameraId && selectedCameraId !== 'default'
          ? { video: { deviceId: { exact: selectedCameraId } }, audio: false }
          : { video: true, audio: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraOpen(true);
      await loadCameraDevices();
    } catch (error) {
      console.error('Failed to start camera', error);
      setCameraError('Nao foi possivel acessar a webcam USB/rede configurada no sistema.');
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current || !vehicle) return;
    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      alert('A webcam ainda nao esta pronta para captura.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      alert('Nao foi possivel capturar imagem da webcam.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));

    if (!blob) {
      alert('Falha ao gerar imagem da captura.');
      return;
    }

    const file = new File([blob], `${vehicle.plate}-webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
    await uploadPhotoFile(file);
  };

  const captureFromNetwork = async () => {
    if (!vehicle || !id) return;
    const sourceUrl = networkImageUrl.trim();
    if (!sourceUrl) {
      alert('Informe a URL da camera em rede.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(sourceUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Resposta nao e uma imagem valida');
      }

      const extension = detectExtensionByMime(blob.type);
      const file = new File([blob], `${vehicle.plate}-rede-${Date.now()}${extension}`, {
        type: blob.type || 'image/jpeg',
      });

      const updatedVehicle = await guardhouseApi.uploadVehiclePhoto(id, file);
      setVehicle((current) => (current ? { ...current, photo: updatedVehicle.photo } : current));
      setImageError(false);
    } catch (error) {
      console.error('Failed to capture image from network camera URL', error);
      alert('Nao foi possivel capturar da camera em rede. Verifique URL, autenticacao e CORS.');
    } finally {
      setUploading(false);
    }
  };

  const saveVehicleEdit = async () => {
    if (!vehicle || !id) return;

    const normalizedPlate = normalizePlate(editForm.plate);
    if (!isValidBrazilPlate(normalizedPlate)) {
      alert('Formato de placa invalido. Use ABC1234 ou BRA2E19.');
      return;
    }

    const selectedDepartment = departments.find((department) => department.id === editForm.destinationDepartmentId);
    const normalizedDriverName = editForm.driverName.trim();

    const payload: GuardhouseVehicleUpdatePayload = {
      plate: normalizedPlate,
      vehicleType: VEHICLE_TYPE_TO_API[editForm.vehicleType],
      category: editForm.category,
      driverName: normalizedDriverName || undefined,
      brand: editForm.brand.trim() || null,
      model: editForm.model.trim() || null,
      color: editForm.color.trim() || null,
      sourceAgency: selectedDepartment?.name ?? null,
      notes: editForm.notes.trim() || null,
    };

    setSavingEdit(true);
    try {
      const updatedVehicle = await guardhouseApi.updateVehicle(id, payload);
      setVehicle((current) => {
        if (!current) return current;

        const updatedMovements = normalizedDriverName
          ? current.movements.map((movement, index) =>
              index === 0
                ? {
                    ...movement,
                    driver: movement.driver
                      ? { ...movement.driver, fullName: normalizedDriverName }
                      : {
                          id: `driver-local-${movement.id}`,
                          fullName: normalizedDriverName,
                          document: null,
                          phone: null,
                          category: movement.accessCategory,
                          department: movement.destinationDepartment ? { ...movement.destinationDepartment } : null,
                        },
                  }
                : movement,
            )
          : current.movements;

        return {
          ...current,
          ...updatedVehicle,
          movements: updatedMovements,
        };
      });
      setIsEditing(false);
      alert('Cadastro atualizado com sucesso.');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        alert('Ja existe um veiculo com esta placa.');
      } else if (isAxiosError(error) && error.response?.status === 403) {
        alert('Seu perfil nao possui permissao para editar cadastro.');
      } else {
        console.error('Failed to update vehicle on details page', error);
        alert('Nao foi possivel atualizar o cadastro do veiculo.');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!vehicle) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Veiculo nao encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CarFront className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Detalhes do Veiculo</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Consulte dados cadastrais, foto e historico operacional do veiculo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/guardhouse/movements">Historico completo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/guardhouse/vehicles">Voltar para lista</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Midia do Veiculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="overflow-hidden rounded-xl border">
              <div
                className={`flex aspect-video items-center justify-center bg-gradient-to-br ${placeholderConfig.surface}`}
              >
                {photoUrl && !imageError ? (
                  <img
                    src={photoUrl}
                    alt={`Foto do veiculo ${vehicle.plate}`}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <placeholderConfig.Icon className={`h-10 w-10 ${placeholderConfig.icon}`} />
                    <p className="text-sm font-semibold text-slate-800">{placeholderConfig.title}</p>
                    <p className="text-xs text-slate-600">{placeholderConfig.subtitle}</p>
                  </div>
                )}
              </div>
            </div>

            {canManagePhoto ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={captureMode === 'file' ? 'default' : 'outline'}
                    onClick={() => setCaptureMode('file')}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Arquivo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={captureMode === 'webcam' ? 'default' : 'outline'}
                    onClick={() => setCaptureMode('webcam')}
                  >
                    <Camera className="mr-1 h-4 w-4" />
                    Webcam
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={captureMode === 'network' ? 'default' : 'outline'}
                    onClick={() => setCaptureMode('network')}
                  >
                    <Link2 className="mr-1 h-4 w-4" />
                    Rede
                  </Button>
                </div>

                {captureMode === 'file' && (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Selecionar imagem'}
                    </Button>
                  </div>
                )}

                {captureMode === 'webcam' && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    {cameraDevices.length > 0 ? (
                      <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {cameraDevices.map((device, index) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${index + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma camera identificada ainda.</p>
                    )}

                    <div className="flex gap-2">
                      {!cameraOpen ? (
                        <Button type="button" size="sm" variant="outline" onClick={startCamera}>
                          <Camera className="mr-2 h-4 w-4" />
                          Abrir camera
                        </Button>
                      ) : (
                        <>
                          <Button type="button" size="sm" disabled={uploading} onClick={captureFromCamera}>
                            Capturar
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
                            Fechar
                          </Button>
                        </>
                      )}
                    </div>

                    {cameraOpen && (
                      <video ref={videoRef} autoPlay muted playsInline className="w-full rounded border" />
                    )}
                    {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
                  </div>
                )}

                {captureMode === 'network' && (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Input
                      value={networkImageUrl}
                      onChange={(event) => setNetworkImageUrl(event.target.value)}
                      placeholder="http://ip-camera/snapshot.jpg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploading}
                      onClick={captureFromNetwork}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      {uploading ? 'Capturando...' : 'Capturar por URL'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                Visualizacao habilitada. Upload e captura de foto disponiveis para ADMIN e RECEPCIONISTA.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
            <CardTitle className="text-base">Resumo Operacional</CardTitle>
            {canEditVehicle ? (
              isEditing ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={savingEdit} onClick={cancelEditMode}>
                    Cancelar
                  </Button>
                  <Button size="sm" disabled={savingEdit} onClick={() => void saveVehicleEdit()}>
                    {savingEdit ? 'Salvando...' : 'Salvar Cadastro'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={startEditMode}>
                  Editar Cadastro
                </Button>
              )
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3">
              <p className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <CarFront className="h-3 w-3" />
                Placa
              </p>
              {isEditing ? (
                <Input
                  value={editForm.plate}
                  onChange={(event) => setEditForm((current) => ({ ...current, plate: event.target.value.toUpperCase() }))}
                  placeholder="ABC1234 ou BRA2E19"
                  maxLength={8}
                />
              ) : (
                <p className="mt-2 text-sm font-semibold">{vehicle.plate}</p>
              )}
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <Bike className="h-3 w-3" />
                Tipo de Veiculo
              </p>
              {isEditing ? (
                <Select
                  value={editForm.vehicleType}
                  onValueChange={(value: VehicleTypeOption) =>
                    setEditForm((current) => ({ ...current, vehicleType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">Carro</SelectItem>
                    <SelectItem value="MOTORCYCLE">Moto</SelectItem>
                    <SelectItem value="PICKUP">Caminhonete</SelectItem>
                    <SelectItem value="VAN">Van</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm font-semibold">{vehicle.vehicleType === 'MOTORCYCLE' ? 'Moto' : 'Carro'}</p>
              )}
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <ShieldAlert className="h-3 w-3" />
                Tipo de Acesso
              </p>
              {isEditing ? (
                <Select
                  value={editForm.category}
                  onValueChange={(value: VehicleCategory) => setEditForm((current) => ({ ...current, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICIAL">Oficial</SelectItem>
                    <SelectItem value="EMPLOYEE">Servidor</SelectItem>
                    <SelectItem value="VISITOR">Visitante</SelectItem>
                    <SelectItem value="CONTRACTOR">Contratado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm font-semibold">{categoryLabel[vehicle.category]}</p>
              )}
            </div>

            <div className="rounded-lg border bg-background p-3">
              <p className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Tipo Departamento de Destino
              </p>
              {isEditing ? (
                <Select
                  value={editForm.destinationDepartmentId || undefined}
                  onValueChange={(value) =>
                    setEditForm((current) => ({ ...current, destinationDepartmentId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={departmentsLoading ? 'Carregando departamentos...' : 'Selecione o departamento'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-department" disabled>
                        Nenhum departamento cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm font-semibold">
                  {latestMovement?.destinationDepartment?.name ?? vehicle.sourceAgency ?? '-'}
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-background p-3 sm:col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Dados de cadastro e entrada</p>
              <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="font-semibold">Marca:</span>{' '}
                  {isEditing ? (
                    <Input
                      value={editForm.brand}
                      onChange={(event) => setEditForm((current) => ({ ...current, brand: event.target.value }))}
                      placeholder="Ex.: Toyota"
                    />
                  ) : (
                    vehicle.brand ?? '-'
                  )}
                </div>
                <div>
                  <span className="font-semibold">Modelo:</span>{' '}
                  {isEditing ? (
                    <Input
                      value={editForm.model}
                      onChange={(event) => setEditForm((current) => ({ ...current, model: event.target.value }))}
                      placeholder="Ex.: Corolla"
                    />
                  ) : (
                    vehicle.model ?? '-'
                  )}
                </div>
                <div>
                  <span className="font-semibold">Cor:</span>{' '}
                  {isEditing ? (
                    <Select
                      value={editForm.color || undefined}
                      onValueChange={(value) => setEditForm((current) => ({ ...current, color: value }))}
                    >
                      <SelectTrigger>
                        {selectedEditColor ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(selectedEditColor)} />
                            <span>{selectedEditColor.value}</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Selecione a cor" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Cores Solidas/Metalicas</SelectLabel>
                          {COLOR_OPTIONS.filter((color) => color.kind === 'solid').map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(color)} />
                                <span>{color.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Especial</SelectLabel>
                          {COLOR_OPTIONS.filter((color) => color.kind === 'gradient').map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(color)} />
                                <span>{color.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    vehicle.color ?? '-'
                  )}
                </div>
                <div>
                  <span className="font-semibold">Condutor:</span>{' '}
                  {isEditing ? (
                    <Input
                      value={editForm.driverName}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, driverName: event.target.value }))
                      }
                      placeholder="Ex.: Joao Silva"
                    />
                  ) : (
                    latestMovement?.driver?.fullName ?? 'Nao informado'
                  )}
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold">Observacoes do Motivo da entrada:</span>{' '}
                  {isEditing ? (
                    <Input
                      value={editForm.notes}
                      onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Observacoes do motivo da entrada"
                    />
                  ) : (
                    displayedEntryNotes || '-'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Linha do Tempo Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {vehicle.movements.slice(0, 6).map((movement) => (
              <div key={movement.id} className="relative border-l-2 border-muted pl-4">
                <span
                  className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ${
                    movement.status === 'PRESENT'
                      ? 'bg-emerald-500'
                      : movement.status === 'FINISHED'
                        ? 'bg-sky-500'
                        : 'bg-rose-500'
                  }`}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{movementStatusLabel[movement.status]}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(movement.entryAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {movement.destinationDepartment?.name ?? '-'} • vaga {movement.spot.code}
                </p>
                <p className="mt-1 text-xs">
                  Permanencia: {formatDuration(movement.durationMinutes, movement.entryAt, movement.exitAt)}
                </p>
              </div>
            ))}
            {vehicle.movements.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem movimentacoes para este veiculo.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Historico do Veiculo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saida</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Departamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicle.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.entryAt)}</TableCell>
                    <TableCell>{formatTime(movement.entryAt)}</TableCell>
                    <TableCell>{movement.exitAt ? formatTime(movement.exitAt) : '-'}</TableCell>
                    <TableCell>{formatDuration(movement.durationMinutes, movement.entryAt, movement.exitAt)}</TableCell>
                    <TableCell>{movement.destinationDepartment?.name ?? '-'}</TableCell>
                  </TableRow>
                ))}
                {vehicle.movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sem movimentacoes para este veiculo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuardhouseVehicleDetails;
