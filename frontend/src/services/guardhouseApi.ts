import api from './api';

export type VehicleCategory = 'OFFICIAL' | 'EMPLOYEE' | 'VISITOR' | 'CONTRACTOR';
export type SpotType = 'CAR' | 'MOTORCYCLE';
export type SpotStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'BLOCKED' | 'MAINTENANCE';
export type MovementStatus = 'PRESENT' | 'FINISHED' | 'CANCELLED';

export interface GuardhouseVehicle {
  id: string;
  plate: string;
  category: VehicleCategory;
  vehicleType: SpotType;
  photo: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  manufactureYear: number | null;
  sourceAgency: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuardhouseDriver {
  id: string;
  fullName: string;
  document: string | null;
  phone: string | null;
  category: VehicleCategory;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface GuardhouseSpot {
  id: string;
  code: string;
  spotType: SpotType;
  sector: string | null;
  status: SpotStatus;
  isActive: boolean;
  movements?: Array<{
    id: string;
    entryAt: string;
    vehicle: GuardhouseVehicle;
    driver?: GuardhouseDriver | null;
  }>;
}

export interface GuardhouseMovement {
  id: string;
  status: MovementStatus;
  accessCategory: VehicleCategory;
  visitReason: string | null;
  entryAt: string;
  exitAt: string | null;
  durationMinutes: number | null;
  entryNotes: string | null;
  exitNotes: string | null;
  vehicle: GuardhouseVehicle;
  driver?: GuardhouseDriver | null;
  spot: GuardhouseSpot;
  destinationDepartment?: {
    id: string;
    name: string;
  } | null;
}

export interface GuardhouseDashboardStats {
  vehiclesInside: number;
  entriesToday: number;
  exitsToday: number;
  movementsInMonth: number;
  averageDurationMinutes: number;
  spots: {
    total: number;
    free: number;
    occupied: number;
    reserved: number;
    blocked: number;
  };
  recentMovements: GuardhouseMovement[];
}

export interface GuardhouseEntryPayload {
  plate: string;
  category?: VehicleCategory;
  vehicleType?: SpotType;
  brand?: string;
  model?: string;
  color?: string;
  sourceAgency?: string;
  driverName?: string;
  driverDocument?: string;
  driverPhone?: string;
  driverCategory?: VehicleCategory;
  departmentId?: string;
  spotId?: string;
  reason?: string;
  entryNotes?: string;
}

export interface GuardhouseVehicleCreatePayload {
  plate: string;
  category?: VehicleCategory;
  vehicleType?: SpotType;
  brand?: string;
  model?: string;
  color?: string;
  manufactureYear?: number;
  sourceAgency?: string;
  notes?: string;
}

export interface GuardhouseVehicleUpdatePayload {
  plate?: string;
  category?: VehicleCategory;
  vehicleType?: SpotType;
  driverName?: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  manufactureYear?: number | null;
  sourceAgency?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export const guardhouseApi = {
  getDashboardStats: async (): Promise<GuardhouseDashboardStats> => {
    const response = await api.get('/guardhouse/dashboard/stats');
    return response.data;
  },

  getLiveFeed: async (limit = 15): Promise<GuardhouseMovement[]> => {
    const response = await api.get('/guardhouse/dashboard/live-feed', {
      params: { limit },
    });
    return response.data;
  },

  getVehicles: async (params?: { search?: string; activeOnly?: boolean }): Promise<GuardhouseVehicle[]> => {
    const response = await api.get('/guardhouse/vehicles', { params });
    return response.data;
  },

  getVehicleById: async (id: string) => {
    const response = await api.get(`/guardhouse/vehicles/${id}`);
    return response.data;
  },

  createVehicle: async (payload: GuardhouseVehicleCreatePayload): Promise<GuardhouseVehicle> => {
    const response = await api.post('/guardhouse/vehicles', payload);
    return response.data;
  },

  updateVehicle: async (id: string, payload: GuardhouseVehicleUpdatePayload): Promise<GuardhouseVehicle> => {
    const response = await api.patch(`/guardhouse/vehicles/${id}`, payload);
    return response.data;
  },

  uploadVehiclePhoto: async (vehicleId: string, file: File): Promise<GuardhouseVehicle> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/guardhouse/vehicles/${vehicleId}/photo`, formData);
    return response.data;
  },

  getDrivers: async (params?: { search?: string; limit?: number }): Promise<GuardhouseDriver[]> => {
    const response = await api.get('/guardhouse/drivers', { params });
    return response.data;
  },

  createDriver: async (payload: Partial<GuardhouseDriver>) => {
    const response = await api.post('/guardhouse/drivers', payload);
    return response.data;
  },

  getSpots: async (params?: { type?: SpotType; status?: SpotStatus; activeOnly?: boolean }): Promise<GuardhouseSpot[]> => {
    const response = await api.get('/guardhouse/spots', { params });
    return response.data;
  },

  updateSpotStatus: async (id: string, status: SpotStatus) => {
    const response = await api.patch(`/guardhouse/spots/${id}/status`, { status });
    return response.data;
  },

  getMovements: async (params?: {
    status?: MovementStatus;
    plate?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<GuardhouseMovement[]> => {
    const response = await api.get('/guardhouse/movements', { params });
    return response.data;
  },

  getMovementById: async (id: string) => {
    const response = await api.get(`/guardhouse/movements/${id}`);
    return response.data;
  },

  registerEntry: async (payload: GuardhouseEntryPayload): Promise<GuardhouseMovement> => {
    const response = await api.post('/guardhouse/movements/entry', payload);
    return response.data;
  },

  registerExit: async (movementId: string, exitNotes?: string): Promise<GuardhouseMovement> => {
    const response = await api.patch(`/guardhouse/movements/${movementId}/exit`, { exitNotes });
    return response.data;
  },
};
