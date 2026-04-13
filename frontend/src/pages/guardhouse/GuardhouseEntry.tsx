import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowRightCircle, Bike, Camera, CarFront, Link2, Save, ShieldAlert, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/services/api';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  guardhouseApi,
  type GuardhouseEntryPayload,
  type GuardhouseMovement,
  type GuardhouseVehicle,
  type GuardhouseVehicleCreatePayload,
  type SpotType,
  type VehicleCategory,
} from '@/services/guardhouseApi';

type VehicleRegistrationForm = {
  plate: string;
  accessType: AccessTypeOption;
  vehicleType: VehicleTypeOption;
  brand: string;
  model: string;
  color: string;
  destinationDepartmentId: string;
  entryReasonNotes: string;
  driverName: string;
};

type SubmissionMode = 'REGISTER_ONLY' | 'REGISTER_AND_ENTRY';
type CaptureMode = 'file' | 'webcam' | 'network';

type VehicleTypeOption = 'CAR' | 'MOTORCYCLE' | 'PICKUP' | 'VAN';
type AccessTypeOption =
  | 'OFFICIAL'
  | 'EMPLOYEE'
  | 'CONTRACTED'
  | 'VISITOR'
  | 'SERVICE_PROVIDER'
  | 'OUTSOURCED';

const VEHICLE_TYPE_LABEL: Record<VehicleTypeOption, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  PICKUP: 'Caminhonete',
  VAN: 'Van',
};

const VEHICLE_TYPE_TO_API: Record<VehicleTypeOption, SpotType> = {
  CAR: 'CAR',
  MOTORCYCLE: 'MOTORCYCLE',
  PICKUP: 'CAR',
  VAN: 'CAR',
};

const ACCESS_TYPE_LABEL: Record<AccessTypeOption, string> = {
  OFFICIAL: 'Oficial',
  EMPLOYEE: 'Servidor',
  CONTRACTED: 'Contratado',
  VISITOR: 'Visitante',
  SERVICE_PROVIDER: 'Prestador de Servico',
  OUTSOURCED: 'Terceirizado',
};

const ACCESS_TYPE_TO_API: Record<AccessTypeOption, VehicleCategory> = {
  OFFICIAL: 'OFFICIAL',
  EMPLOYEE: 'EMPLOYEE',
  CONTRACTED: 'CONTRACTOR',
  VISITOR: 'VISITOR',
  SERVICE_PROVIDER: 'CONTRACTOR',
  OUTSOURCED: 'CONTRACTOR',
};

const API_CATEGORY_TO_ACCESS_TYPE: Record<VehicleCategory, AccessTypeOption> = {
  OFFICIAL: 'OFFICIAL',
  EMPLOYEE: 'EMPLOYEE',
  VISITOR: 'VISITOR',
  CONTRACTOR: 'CONTRACTED',
};

const API_CATEGORY_LABEL: Record<VehicleCategory, string> = {
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

type VehicleEntryDetails = GuardhouseVehicle & {
  blocks: Array<{
    id: string;
    reason: string;
    notes?: string | null;
    startAt: string;
    endAt: string | null;
    isActive: boolean;
  }>;
  movements: GuardhouseMovement[];
};

type DepartmentOption = {
  id: string;
  name: string;
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
  color.kind === 'gradient'
    ? { backgroundImage: color.gradient }
    : { backgroundColor: color.solid };

const emptyToUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const BRAZIL_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const normalizePlate = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const isValidBrazilPlate = (value: string): boolean => BRAZIL_PLATE_REGEX.test(value);

const resolvePhotoUrl = (photoPath: string | null): string | null => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
  const normalized = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `http://localhost:3000${normalized}`;
};

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatDuration = (minutes: number | null, entryAt: string, exitAt: string | null) => {
  const totalMinutes =
    minutes ??
    (exitAt
      ? Math.max(1, Math.round((new Date(exitAt).getTime() - new Date(entryAt).getTime()) / (1000 * 60)))
      : null);

  if (!totalMinutes) return '-';

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}min`;
  return `${hours}h${String(mins).padStart(2, '0')}`;
};

const isMovementBlocked = (
  movement: GuardhouseMovement,
  blocks: VehicleEntryDetails['blocks'] | undefined,
): boolean => {
  if (!blocks || blocks.length === 0) return false;
  const movementStart = new Date(movement.entryAt).getTime();
  const movementEnd = movement.exitAt ? new Date(movement.exitAt).getTime() : Number.POSITIVE_INFINITY;

  return blocks.some((block) => {
    const blockStart = new Date(block.startAt).getTime();
    const blockEnd = block.endAt ? new Date(block.endAt).getTime() : Number.POSITIVE_INFINITY;
    return blockStart <= movementEnd && blockEnd >= movementStart;
  });
};

const detectExtensionByMime = (mimeType: string): string => {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.jpg';
};

const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!isAxiosError(error)) return undefined;

  const data = error.response?.data;
  if (!data || typeof data !== 'object') return undefined;

  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
};

const GuardhouseEntry = () => {
  const [loading, setLoading] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [plateSuggestions, setPlateSuggestions] = useState<string[]>([]);
  const [plateSuggestionsLoading, setPlateSuggestionsLoading] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<GuardhouseVehicle | null>(null);
  const [lastRegisteredSelection, setLastRegisteredSelection] = useState<{
    vehicleType: VehicleTypeOption;
    accessType: AccessTypeOption;
  } | null>(null);
  const [lastEntry, setLastEntry] = useState<GuardhouseMovement | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'media' | 'entry'>('media');
  const [existingVehicle, setExistingVehicle] = useState<GuardhouseVehicle | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleEntryDetails | null>(null);
  const [autoFilledPlate, setAutoFilledPlate] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('file');
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null);
  const [networkImageUrl, setNetworkImageUrl] = useState('');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('default');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [form, setForm] = useState<VehicleRegistrationForm>({
    plate: '',
    vehicleType: 'CAR',
    accessType: 'VISITOR',
    brand: '',
    model: '',
    color: '',
    destinationDepartmentId: '',
    entryReasonNotes: '',
    driverName: '',
  });

  useEffect(() => {
    if (lastEntry) {
      setRightPanelTab('entry');
    }
  }, [lastEntry]);

  const normalizedFormPlate = normalizePlate(form.plate);

  const loadVehicleDetailsById = useCallback(async (vehicleId: string): Promise<VehicleEntryDetails | null> => {
    try {
      const details = (await guardhouseApi.getVehicleById(vehicleId)) as VehicleEntryDetails;
      setVehicleDetails(details);
      return details;
    } catch (error) {
      console.error('Failed to load vehicle details by id on entry page', error);
      return null;
    }
  }, []);

  const loadVehicleDetailsByPlate = useCallback(
    async (plate: string): Promise<VehicleEntryDetails | null> => {
      const normalizedPlate = normalizePlate(plate);
      if (!normalizedPlate) return null;

      try {
        const vehicles = await guardhouseApi.getVehicles({ search: normalizedPlate, activeOnly: false });
        const matched = vehicles.find((vehicle) => normalizePlate(vehicle.plate) === normalizedPlate) ?? null;
        if (!matched) {
          setVehicleDetails(null);
          return null;
        }

        return await loadVehicleDetailsById(matched.id);
      } catch (error) {
        console.error('Failed to load vehicle details by plate on entry page', error);
        return null;
      }
    },
    [loadVehicleDetailsById],
  );

  const applyVehiclePrefill = useCallback(
    (details: VehicleEntryDetails) => {
      const latestMovement = details.movements?.[0] ?? null;
      const destinationDepartmentId =
        latestMovement?.destinationDepartment?.id ??
        departments.find((department) => department.name === (details.sourceAgency ?? ''))?.id ??
        '';

      setForm((prev) => ({
        ...prev,
        plate: details.plate,
        vehicleType: details.vehicleType === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR',
        accessType: API_CATEGORY_TO_ACCESS_TYPE[details.category],
        brand: details.brand ?? '',
        model: details.model ?? '',
        color: details.color ?? '',
        destinationDepartmentId,
        driverName: latestMovement?.driver?.fullName ?? '',
        entryReasonNotes: details.notes ?? latestMovement?.entryNotes ?? '',
      }));
    },
    [departments],
  );

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
      return;
    }

    setSelectedCameraId('default');
  }, []);

  useEffect(() => {
    loadCameraDevices().catch(() => undefined);
  }, [loadCameraDevices]);

  useEffect(() => {
    let active = true;
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        if (!active) return;
        setDepartments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch departments for guardhouse entry', error);
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
  }, []);

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

  useEffect(() => {
    return () => {
      if (pendingPhotoPreviewUrl) {
        URL.revokeObjectURL(pendingPhotoPreviewUrl);
      }
    };
  }, [pendingPhotoPreviewUrl]);

  useEffect(() => {
    if (normalizedFormPlate.length < 3) {
      setPlateSuggestions([]);
      setPlateSuggestionsLoading(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setPlateSuggestionsLoading(true);
      void guardhouseApi
        .getVehicles({ search: normalizedFormPlate, activeOnly: false })
        .then((vehicles) => {
          if (!active) return;

          const suggestions = Array.from(
            new Set(
              vehicles
                .map((vehicle) => normalizePlate(vehicle.plate))
                .filter((plate) => plate.startsWith(normalizedFormPlate)),
            ),
          ).slice(0, 10);

          setPlateSuggestions(suggestions);
        })
        .catch((error) => {
          if (!active) return;
          console.error('Failed to fetch plate suggestions on guardhouse entry', error);
          setPlateSuggestions([]);
        })
        .finally(() => {
          if (active) {
            setPlateSuggestionsLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedFormPlate]);

  useEffect(() => {
    if (!normalizedFormPlate) {
      setLookupLoading(false);
      setAutoFilledPlate(null);
      return;
    }

    if (normalizedFormPlate.length < 7) {
      setLookupLoading(false);
      setAutoFilledPlate(null);
      setVehicleDetails(null);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setLookupLoading(true);
      void loadVehicleDetailsByPlate(normalizedFormPlate).finally(() => {
        if (active) {
          setLookupLoading(false);
        }
      });
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadVehicleDetailsByPlate, normalizedFormPlate]);

  useEffect(() => {
    if (!vehicleDetails) return;
    if (normalizedFormPlate.length !== 7) return;
    if (normalizePlate(vehicleDetails.plate) !== normalizedFormPlate) return;
    if (autoFilledPlate === normalizedFormPlate) return;

    applyVehiclePrefill(vehicleDetails);
    setAutoFilledPlate(normalizedFormPlate);
  }, [applyVehiclePrefill, autoFilledPlate, normalizedFormPlate, vehicleDetails]);

  const setPhotoFile = useCallback((file: File | null) => {
    setPendingPhotoFile(file);
    setPendingPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
  }, []);

  const clearPhotoSelection = useCallback(() => {
    setPhotoFile(null);
    setNetworkImageUrl('');
    setCaptureMode('file');
    setCameraError(null);
    stopCamera();
  }, [setPhotoFile, stopCamera]);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setPhotoFile(file);
      event.target.value = '';
    },
    [setPhotoFile],
  );

  const startCamera = useCallback(async () => {
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
  }, [loadCameraDevices, selectedCameraId, stopCamera]);

  const captureFromCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

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

    const normalizedPlate = normalizePlate(form.plate) || 'veiculo';
    const file = new File([blob], `${normalizedPlate}-webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setPhotoFile(file);
  }, [form.plate, setPhotoFile]);

  const captureFromNetwork = useCallback(async () => {
    const sourceUrl = networkImageUrl.trim();
    if (!sourceUrl) {
      alert('Informe a URL da camera em rede.');
      return;
    }

    setMediaBusy(true);
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
      const normalizedPlate = normalizePlate(form.plate) || 'veiculo';
      const file = new File([blob], `${normalizedPlate}-rede-${Date.now()}${extension}`, {
        type: blob.type || 'image/jpeg',
      });

      setPhotoFile(file);
    } catch (error) {
      console.error('Failed to capture image from network camera URL', error);
      alert('Nao foi possivel capturar da camera em rede. Verifique URL, autenticacao e CORS.');
    } finally {
      setMediaBusy(false);
    }
  }, [form.plate, networkImageUrl, setPhotoFile]);

  const selectedColor = COLOR_OPTIONS.find((color) => color.value === form.color);
  const isMotorcycle = form.vehicleType === 'MOTORCYCLE';
  const historyRows = vehicleDetails?.movements ?? [];
  const activeVehicleBlock = useMemo(
    () =>
      vehicleDetails?.blocks.find((block) => {
        if (!block.isActive) return false;
        const now = Date.now();
        const start = new Date(block.startAt).getTime();
        const end = block.endAt ? new Date(block.endAt).getTime() : Number.POSITIVE_INFINITY;
        return start <= now && end > now;
      }) ?? null,
    [vehicleDetails?.blocks],
  );
  const isEntryBlocked = Boolean(activeVehicleBlock);
  const isVehicleInactive = vehicleDetails?.isActive === false;
  const entryRestrictionMessage = isEntryBlocked
    ? `Veiculo bloqueado para entrada. Motivo: ${activeVehicleBlock?.reason ?? '-'}`
    : isVehicleInactive
      ? 'Veiculo inativo. A entrada nao esta autorizada.'
      : null;
  const summaryPlate = vehicleDetails?.plate ?? lastEntry?.vehicle.plate ?? (normalizedFormPlate || '-');
  const persistedPhotoUrl = resolvePhotoUrl(vehicleDetails?.photo ?? null);
  const previewPhotoUrl = pendingPhotoPreviewUrl ?? persistedPhotoUrl;
  const mediaPlaceholderTitle =
    form.vehicleType === 'MOTORCYCLE'
      ? 'Sem foto de moto'
      : form.vehicleType === 'PICKUP'
        ? 'Sem foto de caminhonete'
        : form.vehicleType === 'VAN'
          ? 'Sem foto de van'
          : 'Sem foto de carro';
  const mediaPlaceholderSubtitle = 'Use arquivo, webcam USB ou camera em rede.';
  const MediaPlaceholderIcon = isMotorcycle ? Bike : CarFront;
  const mediaPlaceholderSurface = isMotorcycle
    ? 'from-amber-100 to-orange-50 border-amber-200'
    : 'from-sky-100 to-indigo-50 border-sky-200';
  const mediaPlaceholderIconColor = isMotorcycle ? 'text-amber-600' : 'text-sky-700';

  const resetForm = () => {
    setForm((prev) => ({
      ...prev,
      plate: '',
      brand: '',
      model: '',
      color: '',
      destinationDepartmentId: '',
      entryReasonNotes: '',
      driverName: '',
    }));
  };

  const submit = async (mode: SubmissionMode) => {
    const plate = normalizePlate(form.plate);
    if (!plate) {
      alert('Informe a placa do veiculo.');
      return;
    }
    if (!isValidBrazilPlate(plate)) {
      alert('Formato de placa invalido. Use ABC1234 ou BRA2E19.');
      return;
    }
    if (mode === 'REGISTER_AND_ENTRY' && (isEntryBlocked || isVehicleInactive)) {
      alert(
        isEntryBlocked
          ? 'Veiculo bloqueado. A entrada nao esta autorizada enquanto o bloqueio estiver ativo.'
          : 'Veiculo inativo. A entrada nao esta autorizada.',
      );
      return;
    }
    const selectedPhotoFile = pendingPhotoFile;

    setLoading(true);
    setLastRegistered(null);
    setLastRegisteredSelection(null);
    setLastEntry(null);
    setExistingVehicle(null);

    try {
      const apiCategory = ACCESS_TYPE_TO_API[form.accessType];
      const apiVehicleType = VEHICLE_TYPE_TO_API[form.vehicleType];
      const selectedDepartment = departments.find((department) => department.id === form.destinationDepartmentId);

      if (mode === 'REGISTER_ONLY') {
        const payload: GuardhouseVehicleCreatePayload = {
          plate,
          category: apiCategory,
          vehicleType: apiVehicleType,
          brand: emptyToUndefined(form.brand),
          model: emptyToUndefined(form.model),
          color: emptyToUndefined(form.color),
          sourceAgency: selectedDepartment?.name,
          notes: emptyToUndefined(form.entryReasonNotes),
        };

        let createdVehicle = await guardhouseApi.createVehicle(payload);
        if (selectedPhotoFile) {
          try {
            createdVehicle = await guardhouseApi.uploadVehiclePhoto(createdVehicle.id, selectedPhotoFile);
          } catch (uploadError) {
            console.error('Failed to upload vehicle photo on register-only flow', uploadError);
            alert('Veiculo cadastrado, mas nao foi possivel enviar a foto.');
          }
        }

        setLastRegistered(createdVehicle);
        setLastRegisteredSelection({
          vehicleType: form.vehicleType,
          accessType: form.accessType,
        });
        await loadVehicleDetailsById(createdVehicle.id);
        resetForm();
        clearPhotoSelection();
        return;
      }

      const payload: GuardhouseEntryPayload = {
        plate,
        category: apiCategory,
        vehicleType: apiVehicleType,
        brand: emptyToUndefined(form.brand),
        model: emptyToUndefined(form.model),
        color: emptyToUndefined(form.color),
        sourceAgency: selectedDepartment?.name,
        departmentId: emptyToUndefined(form.destinationDepartmentId),
        driverName: emptyToUndefined(form.driverName),
        entryNotes: emptyToUndefined(form.entryReasonNotes),
      };

      const movement = await guardhouseApi.registerEntry(payload);
      if (selectedPhotoFile) {
        try {
          await guardhouseApi.uploadVehiclePhoto(movement.vehicle.id, selectedPhotoFile);
        } catch (uploadError) {
          console.error('Failed to upload vehicle photo on register-and-entry flow', uploadError);
          alert('Entrada registrada, mas nao foi possivel enviar a foto.');
        }
      }
      await loadVehicleDetailsById(movement.vehicle.id);
      setLastEntry(movement);
      resetForm();
      clearPhotoSelection();
    } catch (error) {
      const apiMessage = getApiErrorMessage(error);

      if (mode === 'REGISTER_ONLY' && isAxiosError(error) && error.response?.status === 409) {
        const vehicles = await guardhouseApi.getVehicles({ search: plate, activeOnly: false });
        const matched = vehicles.find((vehicle) => vehicle.plate === plate) ?? vehicles[0] ?? null;
        setExistingVehicle(matched);
        if (matched) {
          await loadVehicleDetailsById(matched.id);
        }
        alert(apiMessage ?? 'Placa ja cadastrada no sistema.');
      } else if (mode === 'REGISTER_AND_ENTRY' && isAxiosError(error) && error.response?.status === 409) {
        const normalizedApiMessage = apiMessage?.toLowerCase() ?? '';

        if (normalizedApiMessage.includes('active movement')) {
          alert('Este veiculo ja possui uma entrada ativa. Use a tela de Saida para finalizar a movimentacao.');
        } else if (normalizedApiMessage.includes('no available parking spot')) {
          alert(
            'Nao ha vagas disponiveis para registrar a entrada. Verifique se existem vagas cadastradas e livres no Dashboard da Guarita.',
          );
        } else if (normalizedApiMessage.includes('selected spot is not free')) {
          alert('A vaga selecionada nao esta livre.');
        } else if (normalizedApiMessage.includes('selected spot is inactive')) {
          alert('A vaga selecionada esta inativa.');
        } else if (normalizedApiMessage.includes('spot type does not match')) {
          alert('O tipo da vaga selecionada nao corresponde ao tipo do veiculo.');
        } else {
          alert(apiMessage ?? 'Nao foi possivel registrar a entrada.');
        }
      } else if (isAxiosError(error) && error.response?.status === 403) {
        const normalizedApiMessage = apiMessage?.toLowerCase() ?? '';
        if (normalizedApiMessage.includes('blocked')) {
          alert('Veiculo bloqueado. A entrada nao esta autorizada enquanto o bloqueio estiver ativo.');
        } else if (normalizedApiMessage.includes('inactive')) {
          alert('Veiculo inativo. A entrada nao esta autorizada.');
        } else {
          alert('Seu perfil nao possui permissao para executar esta acao.');
        }
      } else {
        console.error('Failed to process guardhouse entry page action', error);
        alert(apiMessage ?? 'Nao foi possivel processar a solicitacao.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit('REGISTER_AND_ENTRY');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro e Entrada de Veiculo</h1>
          <p className="text-muted-foreground">
            Salve o cadastro do veiculo e, se desejar, ja registre a entrada no patio na mesma tela.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/guardhouse/vehicles">Ver veiculos cadastrados</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CarFront className="h-5 w-5" />
            Formulario de Cadastro e Entrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
              <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Placa *</label>
              <Input
                value={form.plate}
                onChange={(e) => setForm((prev) => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                placeholder="ABC1234 ou BRA2E19"
                maxLength={8}
                list="guardhouse-entry-plate-suggestions"
                autoComplete="off"
                required
              />
              <datalist id="guardhouse-entry-plate-suggestions">
                {plateSuggestions.map((plate) => (
                  <option key={plate} value={plate} />
                ))}
              </datalist>
              {normalizedFormPlate.length >= 3 && (
                <p className="text-xs text-muted-foreground">
                  {plateSuggestionsLoading
                    ? 'Buscando placas cadastradas...'
                    : plateSuggestions.length > 0
                      ? `${plateSuggestions.length} placa(s) encontrada(s) para "${normalizedFormPlate}".`
                      : 'Nenhuma placa cadastrada para este prefixo.'}
                </p>
              )}
              {entryRestrictionMessage && (
                <div className="rounded-lg border-2 border-rose-500 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800 shadow-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-base leading-5">Entrada bloqueada</p>
                      <p className="mt-1 text-sm font-medium">{entryRestrictionMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de veiculo</label>
              <Select
                value={form.vehicleType}
                onValueChange={(value: VehicleTypeOption) => setForm((prev) => ({ ...prev, vehicleType: value }))}
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de acesso</label>
              <Select
                value={form.accessType}
                onValueChange={(value: AccessTypeOption) => setForm((prev) => ({ ...prev, accessType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICIAL">Oficial</SelectItem>
                  <SelectItem value="EMPLOYEE">Servidor</SelectItem>
                  <SelectItem value="CONTRACTED">Contratado</SelectItem>
                  <SelectItem value="VISITOR">Visitante</SelectItem>
                  <SelectItem value="SERVICE_PROVIDER">Prestador de Servico</SelectItem>
                  <SelectItem value="OUTSOURCED">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo departamento de destino</label>
              <Select
                value={form.destinationDepartmentId || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, destinationDepartmentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={departmentsLoading ? 'Carregando departamentos...' : 'Selecione o departamento'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.length > 0 ? (
                    departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-departments" disabled>
                      Nenhum departamento cadastrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Marca</label>
              <Input
                value={form.brand}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
                placeholder="Ex.: Toyota"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo</label>
              <Input
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="Ex.: Corolla"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <Select
                value={form.color || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  {selectedColor ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={getColorSwatchStyle(selectedColor)}
                        aria-hidden
                      />
                      <span>{selectedColor.value}</span>
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
                          <span
                            className="h-4 w-4 rounded-full border"
                            style={getColorSwatchStyle(color)}
                            aria-hidden
                          />
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
                          <span
                            className="h-4 w-4 rounded-full border"
                            style={getColorSwatchStyle(color)}
                            aria-hidden
                          />
                          <span>{color.value}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Condutor</label>
              <Input
                value={form.driverName}
                onChange={(e) => setForm((prev) => ({ ...prev, driverName: e.target.value }))}
                placeholder="Nome do condutor"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Observacoes do Motivo da entrada</label>
              <Input
                value={form.entryReasonNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, entryReasonNotes: e.target.value }))}
                placeholder="Descreva observacoes relacionadas ao motivo da entrada"
              />
            </div>

                <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={loading || isEntryBlocked || isVehicleInactive}
                    className="w-full sm:w-auto"
                  >
                    <ArrowRightCircle className="mr-2 h-4 w-4" />
                    {loading ? 'Processando...' : 'Cadastrar e registrar entrada'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="w-full sm:w-auto"
                    onClick={() => {
                      void submit('REGISTER_ONLY');
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Somente cadastrar veiculo
                  </Button>
                </div>
              </div>

              <div className="xl:sticky xl:top-4">
                <Tabs
                  defaultValue="media"
                  value={rightPanelTab}
                  onValueChange={(value) => setRightPanelTab(value as 'media' | 'entry')}
                >
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 py-3">
                      <TabsList className="grid h-9 w-full grid-cols-2">
                        <TabsTrigger value="media">Midia do Veiculo</TabsTrigger>
                        <TabsTrigger value="entry" disabled={!lastEntry}>
                          Entrada registrada
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    <CardContent className="p-4">
                      <TabsContent value="media" className="space-y-4">
                        <div className="overflow-hidden rounded-xl border">
                          <div
                            className={`flex aspect-video items-center justify-center bg-gradient-to-br ${mediaPlaceholderSurface}`}
                          >
                            {previewPhotoUrl ? (
                              <img
                                src={previewPhotoUrl}
                                alt={`Foto do veiculo ${summaryPlate}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2 px-4 text-center">
                                <MediaPlaceholderIcon className={`h-10 w-10 ${mediaPlaceholderIconColor}`} />
                                <p className="text-sm font-semibold text-slate-800">{mediaPlaceholderTitle}</p>
                                <p className="text-xs text-slate-600">{mediaPlaceholderSubtitle}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={captureMode === 'file' ? 'default' : 'outline'}
                            disabled={loading || mediaBusy}
                            onClick={() => setCaptureMode('file')}
                          >
                            <Upload className="mr-1 h-4 w-4" />
                            Arquivo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={captureMode === 'webcam' ? 'default' : 'outline'}
                            disabled={loading || mediaBusy}
                            onClick={() => setCaptureMode('webcam')}
                          >
                            <Camera className="mr-1 h-4 w-4" />
                            Webcam
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={captureMode === 'network' ? 'default' : 'outline'}
                            disabled={loading || mediaBusy}
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
                              disabled={loading || mediaBusy}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Selecionar imagem
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

                            <div className="flex flex-wrap gap-2">
                              {!cameraOpen ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => void startCamera()}>
                                  <Camera className="mr-2 h-4 w-4" />
                                  Abrir camera
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={loading || mediaBusy}
                                    onClick={() => void captureFromCamera()}
                                  >
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
                              disabled={loading || mediaBusy}
                              onClick={() => void captureFromNetwork()}
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              {mediaBusy ? 'Capturando...' : 'Capturar por URL'}
                            </Button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <p>Foto vinculada no momento do cadastro/entrada.</p>
                          {pendingPhotoFile && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-auto px-1 py-0 text-xs"
                              disabled={loading || mediaBusy}
                              onClick={clearPhotoSelection}
                            >
                              Remover foto
                            </Button>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="entry" className="space-y-2 text-sm">
                        {lastEntry ? (
                          <>
                            <p>
                              <span className="font-semibold">Placa:</span> {lastEntry.vehicle.plate}
                            </p>
                            <p>
                              <span className="font-semibold">Condutor:</span>{' '}
                              {lastEntry.driver?.fullName ?? 'Nao informado'}
                            </p>
                            <p>
                              <span className="font-semibold">Vaga:</span> {lastEntry.spot.code}
                            </p>
                            <p>
                              <span className="font-semibold">Entrada:</span>{' '}
                              {new Date(lastEntry.entryAt).toLocaleString('pt-BR')}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" variant="outline" asChild>
                                <Link to="/guardhouse/exit">Ir para registrar saida</Link>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/guardhouse/vehicles/${lastEntry.vehicle.id}`}>Abrir detalhes do veiculo</Link>
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground">Nenhuma entrada registrada nesta sessao.</p>
                        )}
                      </TabsContent>
                    </CardContent>
                  </Card>
                </Tabs>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base uppercase">Historico do Veiculo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saida</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Bloqueio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lookupLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Carregando historico...
                  </TableCell>
                </TableRow>
              )}

              {!lookupLoading &&
                historyRows.slice(0, 10).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.entryAt)}</TableCell>
                    <TableCell>{formatTime(movement.entryAt)}</TableCell>
                    <TableCell>{movement.exitAt ? formatTime(movement.exitAt) : '-'}</TableCell>
                    <TableCell>{formatDuration(movement.durationMinutes, movement.entryAt, movement.exitAt)}</TableCell>
                    <TableCell>{movement.destinationDepartment?.name ?? '-'}</TableCell>
                    <TableCell>
                      {isMovementBlocked(movement, vehicleDetails?.blocks) ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Livre
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

              {!lookupLoading && historyRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Digite uma placa cadastrada para visualizar o historico do veiculo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {lastRegistered && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardHeader>
            <CardTitle>Veiculo cadastrado com sucesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Placa:</span> {lastRegistered.plate}
            </p>
            <p>
              <span className="font-semibold">Tipo:</span>{' '}
              {lastRegisteredSelection
                ? VEHICLE_TYPE_LABEL[lastRegisteredSelection.vehicleType]
                : lastRegistered.vehicleType === 'CAR'
                  ? 'Carro'
                  : 'Moto'}
            </p>
            <p>
              <span className="font-semibold">Tipo de acesso:</span>{' '}
              {lastRegisteredSelection
                ? ACCESS_TYPE_LABEL[lastRegisteredSelection.accessType]
                : API_CATEGORY_LABEL[lastRegistered.category]}
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/guardhouse/vehicles/${lastRegistered.id}`}>Abrir detalhes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {existingVehicle && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle>Veiculo ja existente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              A placa <span className="font-semibold">{existingVehicle.plate}</span> ja esta cadastrada.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/guardhouse/vehicles/${existingVehicle.id}`}>Ver cadastro existente</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GuardhouseEntry;
