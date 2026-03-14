import {
  MovementStatus,
  OccurrenceType,
  PhotoType,
  Prisma,
  SpotStatus,
  SpotType,
  VehicleCategory,
} from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import prisma from '../utils/prisma.js';

const VEHICLE_CATEGORY_VALUES = Object.values(VehicleCategory);
const SPOT_TYPE_VALUES = Object.values(SpotType);
const SPOT_STATUS_VALUES = Object.values(SpotStatus);
const MOVEMENT_STATUS_VALUES = Object.values(MovementStatus);
const PHOTO_TYPE_VALUES = Object.values(PhotoType);
const OCCURRENCE_TYPE_VALUES = Object.values(OccurrenceType);
const GUARDHOUSE_VEHICLE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'guardhouse', 'vehicles');

const movementInclude = {
  vehicle: true,
  driver: true,
  spot: true,
  destinationDepartment: {
    select: {
      id: true,
      name: true,
    },
  },
  registeredByEntry: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  registeredByExit: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.GuardhouseVehicleMovementInclude;

const blockInclude = {
  registeredBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  unblockedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.GuardhouseVehicleBlockInclude;

type AuthUser = {
  id: string;
  role: string;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asInteger = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const asDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
};

const parseLimit = (value: unknown, fallback = 20, max = 100): number => {
  const parsed = asInteger(value);
  if (!parsed || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const BRAZIL_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const normalizePlate = (plate: string): string => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
const isValidBrazilPlate = (plate: string): boolean => BRAZIL_PLATE_REGEX.test(plate);

const normalizeDocument = (document: string): string => document.replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getImageExtension = (mimetype: string, originalName: string): string => {
  const byMime: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  if (byMime[mimetype]) {
    return byMime[mimetype];
  }

  const ext = path.extname(originalName).toLowerCase();
  if (ext) {
    return ext;
  }

  return '.jpg';
};

const parseVehiclePhotoFilename = (photoPath: string | null): string | null => {
  if (!photoPath) return null;
  const normalized = photoPath.replace(/\\/g, '/');
  if (!normalized.startsWith('/uploads/guardhouse/vehicles/')) return null;
  return path.basename(normalized);
};

const isVehicleCategory = (value: string): value is VehicleCategory =>
  VEHICLE_CATEGORY_VALUES.includes(value as VehicleCategory);

const isSpotType = (value: string): value is SpotType => SPOT_TYPE_VALUES.includes(value as SpotType);

const isSpotStatus = (value: string): value is SpotStatus => SPOT_STATUS_VALUES.includes(value as SpotStatus);

const isMovementStatus = (value: string): value is MovementStatus =>
  MOVEMENT_STATUS_VALUES.includes(value as MovementStatus);

const isPhotoType = (value: string): value is PhotoType => PHOTO_TYPE_VALUES.includes(value as PhotoType);

const isOccurrenceType = (value: string): value is OccurrenceType =>
  OCCURRENCE_TYPE_VALUES.includes(value as OccurrenceType);

const getAuthUser = (req: AuthRequest, res: Response): AuthUser | undefined => {
  const user = req.user as AuthUser | undefined;
  if (!user?.id || !user?.role) {
    res.status(401).json({ message: 'Unauthorized' });
    return undefined;
  }

  return user;
};

const isPrismaError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const hasActiveBlockWhere: Prisma.GuardhouseVehicleBlockWhereInput = {
  isActive: true,
  startAt: { lte: new Date() },
  OR: [{ endAt: null }, { endAt: { gt: new Date() } }],
};

export const getGuardhouseDashboardStats = async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      vehiclesInside,
      entriesToday,
      exitsToday,
      movementsInMonth,
      averageDuration,
      totalSpots,
      freeSpots,
      occupiedSpots,
      reservedSpots,
      blockedSpots,
      recentMovements,
    ] = await Promise.all([
      prisma.guardhouseVehicleMovement.count({
        where: { status: MovementStatus.PRESENT },
      }),
      prisma.guardhouseVehicleMovement.count({
        where: {
          entryAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.guardhouseVehicleMovement.count({
        where: {
          exitAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.guardhouseVehicleMovement.count({
        where: {
          entryAt: {
            gte: monthStart,
          },
        },
      }),
      prisma.guardhouseVehicleMovement.aggregate({
        where: {
          status: MovementStatus.FINISHED,
          durationMinutes: {
            not: null,
          },
        },
        _avg: {
          durationMinutes: true,
        },
      }),
      prisma.guardhouseParkingSpot.count({
        where: {
          isActive: true,
        },
      }),
      prisma.guardhouseParkingSpot.count({
        where: {
          isActive: true,
          status: SpotStatus.FREE,
        },
      }),
      prisma.guardhouseParkingSpot.count({
        where: {
          isActive: true,
          status: SpotStatus.OCCUPIED,
        },
      }),
      prisma.guardhouseParkingSpot.count({
        where: {
          isActive: true,
          status: SpotStatus.RESERVED,
        },
      }),
      prisma.guardhouseParkingSpot.count({
        where: {
          isActive: true,
          status: {
            in: [SpotStatus.BLOCKED, SpotStatus.MAINTENANCE],
          },
        },
      }),
      prisma.guardhouseVehicleMovement.findMany({
        take: 30,
        orderBy: {
          updatedAt: 'desc',
        },
        include: movementInclude,
      }),
    ]);

    res.json({
      vehiclesInside,
      entriesToday,
      exitsToday,
      movementsInMonth,
      averageDurationMinutes: Math.round(averageDuration._avg.durationMinutes ?? 0),
      spots: {
        total: totalSpots,
        free: freeSpots,
        occupied: occupiedSpots,
        reserved: reservedSpots,
        blocked: blockedSpots,
      },
      recentMovements,
    });
  } catch (error) {
    console.error('Error fetching guardhouse dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseLiveFeed = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseLimit(req.query.limit, 15, 80);

    const movements = await prisma.guardhouseVehicleMovement.findMany({
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
      include: movementInclude,
    });

    const feed = movements.map((movement) => ({
      ...movement,
      eventType:
        movement.status === MovementStatus.FINISHED
          ? 'EXIT'
          : movement.status === MovementStatus.PRESENT
            ? 'ENTRY'
            : 'CANCELLED',
      eventAt: movement.status === MovementStatus.FINISHED && movement.exitAt ? movement.exitAt : movement.entryAt,
    }));

    res.json(feed);
  } catch (error) {
    console.error('Error fetching guardhouse live feed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const search = asString(req.query.search);
    const activeOnly = req.query.activeOnly !== 'false';
    const normalizedSearch = search ? normalizePlate(search) : undefined;

    const where: Prisma.GuardhouseVehicleWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { plate: { contains: normalizedSearch && normalizedSearch.length > 0 ? normalizedSearch : search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vehicles = await prisma.guardhouseVehicle.findMany({
      where,
      include: {
        blocks: {
          where: hasActiveBlockWhere,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            movements: true,
          },
        },
      },
      orderBy: {
        plate: 'asc',
      },
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Error listing guardhouse vehicles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseVehicleById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.guardhouseVehicle.findUnique({
      where: { id: id as string },
      include: {
        blocks: {
          include: blockInclude,
          orderBy: {
            createdAt: 'desc',
          },
        },
        movements: {
          take: 25,
          orderBy: {
            entryAt: 'desc',
          },
          include: movementInclude,
        },
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Error getting guardhouse vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createGuardhouseVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const plateValue = asString(req.body.plate);
    if (!plateValue) {
      return res.status(400).json({ message: 'Plate is required' });
    }

    const normalizedPlate = normalizePlate(plateValue);
    if (!isValidBrazilPlate(normalizedPlate)) {
      return res.status(400).json({ message: 'Invalid plate format' });
    }

    const categoryRaw = asString(req.body.category);
    const category = categoryRaw && isVehicleCategory(categoryRaw) ? categoryRaw : undefined;
    if (categoryRaw && !category) {
      return res.status(400).json({ message: 'Invalid vehicle category' });
    }

    const vehicleTypeRaw = asString(req.body.vehicleType);
    const vehicleType = vehicleTypeRaw && isSpotType(vehicleTypeRaw) ? vehicleTypeRaw : undefined;
    if (vehicleTypeRaw && !vehicleType) {
      return res.status(400).json({ message: 'Invalid vehicle type' });
    }

    const manufactureYear = asInteger(req.body.manufactureYear);
    if (req.body.manufactureYear !== undefined && manufactureYear === undefined) {
      return res.status(400).json({ message: 'Invalid manufacture year' });
    }

    const createdVehicle = await prisma.guardhouseVehicle.create({
      data: {
        plate: normalizedPlate,
        category: category ?? VehicleCategory.VISITOR,
        vehicleType: vehicleType ?? SpotType.CAR,
        brand: asString(req.body.brand) ?? null,
        model: asString(req.body.model) ?? null,
        color: asString(req.body.color) ?? null,
        manufactureYear: manufactureYear ?? null,
        sourceAgency: asString(req.body.sourceAgency) ?? null,
        notes: asString(req.body.notes) ?? null,
      },
    });

    res.status(201).json(createdVehicle);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return res.status(409).json({ message: 'Vehicle with this plate already exists' });
    }

    console.error('Error creating guardhouse vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGuardhouseVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const data: Prisma.GuardhouseVehicleUpdateInput = {};
    const hasDriverNameField = req.body.driverName !== undefined;
    const driverName = asString(req.body.driverName);

    if (hasDriverNameField && !driverName) {
      return res.status(400).json({ message: 'Driver name is required' });
    }

    const plateValue = asString(req.body.plate);
    if (plateValue) {
      const normalizedPlate = normalizePlate(plateValue);
      if (!isValidBrazilPlate(normalizedPlate)) {
        return res.status(400).json({ message: 'Invalid plate format' });
      }
      data.plate = normalizedPlate;
    }

    const categoryRaw = asString(req.body.category);
    if (categoryRaw) {
      if (!isVehicleCategory(categoryRaw)) {
        return res.status(400).json({ message: 'Invalid vehicle category' });
      }
      data.category = categoryRaw;
    }

    const vehicleTypeRaw = asString(req.body.vehicleType);
    if (vehicleTypeRaw) {
      if (!isSpotType(vehicleTypeRaw)) {
        return res.status(400).json({ message: 'Invalid vehicle type' });
      }
      data.vehicleType = vehicleTypeRaw;
    }

    if (req.body.brand !== undefined) data.brand = asString(req.body.brand) ?? null;
    if (req.body.model !== undefined) data.model = asString(req.body.model) ?? null;
    if (req.body.color !== undefined) data.color = asString(req.body.color) ?? null;
    if (req.body.sourceAgency !== undefined) data.sourceAgency = asString(req.body.sourceAgency) ?? null;
    if (req.body.notes !== undefined) data.notes = asString(req.body.notes) ?? null;
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

    if (req.body.manufactureYear !== undefined) {
      const manufactureYear = asInteger(req.body.manufactureYear);
      if (manufactureYear === undefined) {
        return res.status(400).json({ message: 'Invalid manufacture year' });
      }
      data.manufactureYear = manufactureYear;
    }

    const hasVehicleFields = Object.keys(data).length > 0;
    if (!hasVehicleFields && !hasDriverNameField) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      const vehicle = hasVehicleFields
        ? await tx.guardhouseVehicle.update({
            where: { id: id as string },
            data,
          })
        : await tx.guardhouseVehicle.findUniqueOrThrow({
            where: { id: id as string },
          });

      if (driverName) {
        const latestMovement = await tx.guardhouseVehicleMovement.findFirst({
          where: { vehicleId: id as string },
          orderBy: { entryAt: 'desc' },
          select: {
            id: true,
            driverId: true,
            destinationDepartmentId: true,
          },
        });

        if (latestMovement) {
          if (latestMovement.driverId) {
            await tx.guardhouseDriver.update({
              where: { id: latestMovement.driverId },
              data: { fullName: driverName },
            });
          } else {
            const createdDriver = await tx.guardhouseDriver.create({
              data: {
                fullName: driverName,
                category: vehicle.category,
                departmentId: latestMovement.destinationDepartmentId ?? null,
              },
            });

            await tx.guardhouseVehicleMovement.update({
              where: { id: latestMovement.id },
              data: { driverId: createdDriver.id },
            });
          }
        }
      }

      return vehicle;
    });

    res.json(updatedVehicle);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (isPrismaError(error, 'P2002')) {
      return res.status(409).json({ message: 'Vehicle with this plate already exists' });
    }

    console.error('Error updating guardhouse vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadGuardhouseVehiclePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = (req as AuthRequest & { file?: { buffer: Buffer; mimetype: string; originalname: string } }).file;

    if (!file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }

    const vehicle = await prisma.guardhouseVehicle.findUnique({
      where: { id: id as string },
      select: { id: true, photo: true },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await fs.mkdir(GUARDHOUSE_VEHICLE_UPLOAD_DIR, { recursive: true });

    const extension = getImageExtension(file.mimetype, file.originalname);
    const filename = `${vehicle.id}-${Date.now()}${extension}`;
    const absolutePath = path.join(GUARDHOUSE_VEHICLE_UPLOAD_DIR, filename);
    const publicPath = `/uploads/guardhouse/vehicles/${filename}`;

    await fs.writeFile(absolutePath, file.buffer);

    const updatedVehicle = await prisma.guardhouseVehicle.update({
      where: { id: vehicle.id },
      data: { photo: publicPath },
    });

    const oldFilename = parseVehiclePhotoFilename(vehicle.photo);
    if (oldFilename && oldFilename !== filename) {
      const oldAbsolutePath = path.join(GUARDHOUSE_VEHICLE_UPLOAD_DIR, oldFilename);
      await fs.unlink(oldAbsolutePath).catch(() => undefined);
    }

    res.json(updatedVehicle);
  } catch (error) {
    console.error('Error uploading guardhouse vehicle photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const blockGuardhouseVehicle = async (req: AuthRequest, res: Response) => {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  try {
    const { id } = req.params;
    const reason = asString(req.body.reason);
    const notes = asString(req.body.notes);
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const endAt = req.body.endAt !== undefined ? asDate(req.body.endAt) : undefined;
    if (req.body.endAt !== undefined && !endAt) {
      return res.status(400).json({ message: 'Invalid end date' });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.guardhouseVehicle.findUniqueOrThrow({
        where: { id: id as string },
      });

      await tx.guardhouseVehicleBlock.updateMany({
        where: {
          vehicleId: id as string,
          isActive: true,
        },
        data: {
          isActive: false,
          endAt: now,
          unblockedById: authUser.id,
        },
      });

      return tx.guardhouseVehicleBlock.create({
        data: {
          vehicleId: id as string,
          reason,
          notes: notes ?? null,
          startAt: now,
          endAt: endAt ?? null,
          isActive: true,
          registeredById: authUser.id,
        },
        include: blockInclude,
      });
    });

    res.status(201).json(result);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    console.error('Error blocking guardhouse vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unblockGuardhouseVehicle = async (req: AuthRequest, res: Response) => {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  try {
    const { id } = req.params;
    const now = new Date();

    const updated = await prisma.guardhouseVehicleBlock.updateMany({
      where: {
        vehicleId: id as string,
        isActive: true,
      },
      data: {
        isActive: false,
        endAt: now,
        unblockedById: authUser.id,
      },
    });

    res.json({ updatedBlocks: updated.count });
  } catch (error) {
    console.error('Error unblocking guardhouse vehicle:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseDrivers = async (req: AuthRequest, res: Response) => {
  try {
    const search = asString(req.query.search);
    const activeOnly = req.query.activeOnly !== 'false';
    const limit = parseLimit(req.query.limit, 30, 100);

    const where: Prisma.GuardhouseDriverWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ];
    }

    const drivers = await prisma.guardhouseDriver.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
      take: limit,
    });

    res.json(drivers);
  } catch (error) {
    console.error('Error listing guardhouse drivers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createGuardhouseDriver = async (req: AuthRequest, res: Response) => {
  try {
    const fullName = asString(req.body.fullName);
    if (!fullName) {
      return res.status(400).json({ message: 'Driver name is required' });
    }

    const categoryRaw = asString(req.body.category);
    const category = categoryRaw && isVehicleCategory(categoryRaw) ? categoryRaw : undefined;
    if (categoryRaw && !category) {
      return res.status(400).json({ message: 'Invalid driver category' });
    }

    const departmentId = asString(req.body.departmentId);
    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) {
        return res.status(400).json({ message: 'Invalid departmentId' });
      }
    }

    const documentRaw = asString(req.body.document);
    const document = documentRaw ? normalizeDocument(documentRaw) : undefined;

    const driver = await prisma.guardhouseDriver.create({
      data: {
        fullName,
        document: document ?? null,
        phone: asString(req.body.phone) ?? null,
        category: category ?? VehicleCategory.VISITOR,
        departmentId: departmentId ?? null,
        notes: asString(req.body.notes) ?? null,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(driver);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return res.status(409).json({ message: 'Driver with this document already exists' });
    }

    console.error('Error creating guardhouse driver:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseSpots = async (req: AuthRequest, res: Response) => {
  try {
    const typeRaw = asString(req.query.type);
    const statusRaw = asString(req.query.status);
    const activeOnly = req.query.activeOnly !== 'false';

    const where: Prisma.GuardhouseParkingSpotWhereInput = {};

    if (typeRaw) {
      if (!isSpotType(typeRaw)) {
        return res.status(400).json({ message: 'Invalid spot type' });
      }
      where.spotType = typeRaw;
    }

    if (statusRaw) {
      if (!isSpotStatus(statusRaw)) {
        return res.status(400).json({ message: 'Invalid spot status' });
      }
      where.status = statusRaw;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const spots = await prisma.guardhouseParkingSpot.findMany({
      where,
      include: {
        movements: {
          where: {
            status: MovementStatus.PRESENT,
          },
          orderBy: {
            entryAt: 'desc',
          },
          take: 1,
          include: {
            vehicle: true,
            driver: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    res.json(spots);
  } catch (error) {
    console.error('Error listing guardhouse spots:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGuardhouseSpotStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const statusRaw = asString(req.body.status);

    if (!statusRaw || !isSpotStatus(statusRaw)) {
      return res.status(400).json({ message: 'Invalid spot status' });
    }

    const updatedSpot = await prisma.guardhouseParkingSpot.update({
      where: { id: id as string },
      data: {
        status: statusRaw,
        notes: req.body.notes !== undefined ? asString(req.body.notes) ?? null : undefined,
      },
    });

    res.json(updatedSpot);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return res.status(404).json({ message: 'Spot not found' });
    }

    console.error('Error updating guardhouse spot status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseMovements = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = asString(req.query.status);
    const plate = asString(req.query.plate);
    const fromDate = asDate(req.query.dateFrom);
    const toDate = asDate(req.query.dateTo);
    const limit = parseLimit(req.query.limit, 50, 200);

    const where: Prisma.GuardhouseVehicleMovementWhereInput = {};

    if (statusRaw) {
      if (!isMovementStatus(statusRaw)) {
        return res.status(400).json({ message: 'Invalid movement status' });
      }
      where.status = statusRaw;
    }

    if (fromDate || toDate) {
      where.entryAt = {};
      if (fromDate) {
        where.entryAt.gte = fromDate;
      }
      if (toDate) {
        where.entryAt.lte = toDate;
      }
    }

    if (plate) {
      where.vehicle = {
        plate: {
          contains: normalizePlate(plate),
          mode: 'insensitive',
        },
      };
    }

    const movements = await prisma.guardhouseVehicleMovement.findMany({
      where,
      include: movementInclude,
      orderBy: {
        entryAt: 'desc',
      },
      take: limit,
    });

    res.json(movements);
  } catch (error) {
    console.error('Error listing guardhouse movements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getGuardhouseMovementById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const movement = await prisma.guardhouseVehicleMovement.findUnique({
      where: { id: id as string },
      include: {
        ...movementInclude,
        photos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        occurrences: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            registeredBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!movement) {
      return res.status(404).json({ message: 'Movement not found' });
    }

    res.json(movement);
  } catch (error) {
    console.error('Error getting guardhouse movement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerGuardhouseEntry = async (req: AuthRequest, res: Response) => {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  try {
    const plateRaw = asString(req.body.plate);
    if (!plateRaw) {
      return res.status(400).json({ message: 'Plate is required' });
    }

    const plate = normalizePlate(plateRaw);
    if (!isValidBrazilPlate(plate)) {
      return res.status(400).json({ message: 'Invalid plate format' });
    }

    const categoryRaw = asString(req.body.category);
    const category = categoryRaw && isVehicleCategory(categoryRaw) ? categoryRaw : undefined;
    if (categoryRaw && !category) {
      return res.status(400).json({ message: 'Invalid access category' });
    }

    const vehicleTypeRaw = asString(req.body.vehicleType);
    const vehicleType = vehicleTypeRaw && isSpotType(vehicleTypeRaw) ? vehicleTypeRaw : undefined;
    if (vehicleTypeRaw && !vehicleType) {
      return res.status(400).json({ message: 'Invalid vehicle type' });
    }

    const driverCategoryRaw = asString(req.body.driverCategory);
    const driverCategory =
      driverCategoryRaw && isVehicleCategory(driverCategoryRaw) ? driverCategoryRaw : undefined;
    if (driverCategoryRaw && !driverCategory) {
      return res.status(400).json({ message: 'Invalid driver category' });
    }

    const departmentId = asString(req.body.departmentId);
    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) {
        return res.status(400).json({ message: 'Invalid departmentId' });
      }
    }

    const requestedSpotId = asString(req.body.spotId);
    const reason = asString(req.body.reason);
    const entryNotes = asString(req.body.entryNotes);
    const brand = asString(req.body.brand);
    const model = asString(req.body.model);
    const color = asString(req.body.color);
    const sourceAgency = asString(req.body.sourceAgency);
    const driverName = asString(req.body.driverName);
    const driverDocumentRaw = asString(req.body.driverDocument);
    const driverDocument = driverDocumentRaw ? normalizeDocument(driverDocumentRaw) : undefined;
    const driverPhone = asString(req.body.driverPhone);

    const now = new Date();

    const movement = await prisma.$transaction(async (tx) => {
      let vehicle = await tx.guardhouseVehicle.findUnique({
        where: { plate },
      });

      if (!vehicle) {
        vehicle = await tx.guardhouseVehicle.create({
          data: {
            plate,
            category: category ?? VehicleCategory.VISITOR,
            vehicleType: vehicleType ?? SpotType.CAR,
            brand: brand ?? null,
            model: model ?? null,
            color: color ?? null,
            sourceAgency: sourceAgency ?? null,
          },
        });
      } else {
        const vehicleUpdateData: Prisma.GuardhouseVehicleUpdateInput = {};
        if (category) vehicleUpdateData.category = category;
        if (vehicleType) vehicleUpdateData.vehicleType = vehicleType;
        if (brand && !vehicle.brand) vehicleUpdateData.brand = brand;
        if (model && !vehicle.model) vehicleUpdateData.model = model;
        if (color && !vehicle.color) vehicleUpdateData.color = color;
        if (sourceAgency && !vehicle.sourceAgency) vehicleUpdateData.sourceAgency = sourceAgency;
        if (Object.keys(vehicleUpdateData).length > 0) {
          vehicle = await tx.guardhouseVehicle.update({
            where: { id: vehicle.id },
            data: vehicleUpdateData,
          });
        }
      }

      if (!vehicle.isActive) {
        throw new Error('VEHICLE_INACTIVE');
      }

      const activeBlock = await tx.guardhouseVehicleBlock.findFirst({
        where: {
          vehicleId: vehicle.id,
          isActive: true,
          startAt: { lte: now },
          OR: [{ endAt: null }, { endAt: { gt: now } }],
        },
        orderBy: {
          startAt: 'desc',
        },
      });

      if (activeBlock) {
        throw new Error('VEHICLE_BLOCKED');
      }

      const openMovement = await tx.guardhouseVehicleMovement.findFirst({
        where: {
          vehicleId: vehicle.id,
          status: MovementStatus.PRESENT,
        },
        select: {
          id: true,
        },
      });

      if (openMovement) {
        throw new Error('OPEN_MOVEMENT_EXISTS');
      }

      let driverId: string | null = null;

      if (driverDocument || driverName) {
        let driver = driverDocument
          ? await tx.guardhouseDriver.findUnique({
              where: {
                document: driverDocument,
              },
            })
          : null;

        if (!driver) {
          if (!driverName) {
            throw new Error('DRIVER_NAME_REQUIRED');
          }

          driver = await tx.guardhouseDriver.create({
            data: {
              fullName: driverName,
              document: driverDocument ?? null,
              phone: driverPhone ?? null,
              category: driverCategory ?? VehicleCategory.VISITOR,
              departmentId: departmentId ?? null,
            },
          });
        } else {
          const driverUpdateData: Prisma.GuardhouseDriverUpdateInput = {};
          if (driverName) driverUpdateData.fullName = driverName;
          if (driverPhone) driverUpdateData.phone = driverPhone;
          if (driverCategory) driverUpdateData.category = driverCategory;
          if (departmentId) {
            driverUpdateData.department = { connect: { id: departmentId } };
          }
          if (Object.keys(driverUpdateData).length > 0) {
            driver = await tx.guardhouseDriver.update({
              where: { id: driver.id },
              data: driverUpdateData,
            });
          }
        }

        driverId = driver.id;
      }

      let selectedSpot: { id: string; code: string; status: SpotStatus; spotType: SpotType; isActive: boolean } | null =
        null;

      if (requestedSpotId) {
        selectedSpot = await tx.guardhouseParkingSpot.findUnique({
          where: {
            id: requestedSpotId,
          },
          select: {
            id: true,
            code: true,
            status: true,
            spotType: true,
            isActive: true,
          },
        });

        if (!selectedSpot) {
          throw new Error('SPOT_NOT_FOUND');
        }
      } else {
        selectedSpot = await tx.guardhouseParkingSpot.findFirst({
          where: {
            isActive: true,
            spotType: vehicleType ?? vehicle.vehicleType,
            status: SpotStatus.FREE,
          },
          orderBy: {
            code: 'asc',
          },
          select: {
            id: true,
            code: true,
            status: true,
            spotType: true,
            isActive: true,
          },
        });
      }

      if (!selectedSpot) {
        throw new Error('NO_SPOT_AVAILABLE');
      }

      if (!selectedSpot.isActive) {
        throw new Error('SPOT_INACTIVE');
      }

      if (selectedSpot.status !== SpotStatus.FREE) {
        throw new Error('SPOT_NOT_FREE');
      }

      const targetType = vehicleType ?? vehicle.vehicleType;
      if (selectedSpot.spotType !== targetType) {
        throw new Error('SPOT_TYPE_MISMATCH');
      }

      await tx.guardhouseParkingSpot.update({
        where: { id: selectedSpot.id },
        data: { status: SpotStatus.OCCUPIED },
      });

      return tx.guardhouseVehicleMovement.create({
        data: {
          vehicleId: vehicle.id,
          driverId,
          spotId: selectedSpot.id,
          destinationDepartmentId: departmentId ?? null,
          accessCategory: category ?? vehicle.category,
          visitReason: reason ?? null,
          entryAt: now,
          status: MovementStatus.PRESENT,
          entryNotes: entryNotes ?? null,
          registeredByEntryId: authUser.id,
        },
        include: movementInclude,
      });
    });

    res.status(201).json(movement);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'VEHICLE_INACTIVE') {
        return res.status(403).json({ message: 'Vehicle is inactive for access' });
      }

      if (error.message === 'VEHICLE_BLOCKED') {
        return res.status(403).json({ message: 'Vehicle is blocked for access' });
      }

      if (error.message === 'OPEN_MOVEMENT_EXISTS') {
        return res.status(409).json({ message: 'Vehicle already has an active movement' });
      }

      if (error.message === 'NO_SPOT_AVAILABLE') {
        return res.status(409).json({ message: 'No available parking spot' });
      }

      if (error.message === 'SPOT_NOT_FREE') {
        return res.status(409).json({ message: 'Selected spot is not free' });
      }

      if (error.message === 'SPOT_NOT_FOUND') {
        return res.status(404).json({ message: 'Spot not found' });
      }

      if (error.message === 'SPOT_INACTIVE') {
        return res.status(409).json({ message: 'Selected spot is inactive' });
      }

      if (error.message === 'SPOT_TYPE_MISMATCH') {
        return res.status(409).json({ message: 'Selected spot type does not match vehicle type' });
      }

      if (error.message === 'DRIVER_NAME_REQUIRED') {
        return res.status(400).json({ message: 'Driver name is required when creating a new driver' });
      }
    }

    console.error('Error registering guardhouse entry:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerGuardhouseExit = async (req: AuthRequest, res: Response) => {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  try {
    const { id } = req.params;
    const exitNotes = asString(req.body.exitNotes);
    const now = new Date();

    const movement = await prisma.$transaction(async (tx) => {
      const openMovement = await tx.guardhouseVehicleMovement.findUnique({
        where: {
          id: id as string,
        },
        include: {
          spot: true,
        },
      });

      if (!openMovement) {
        throw new Error('MOVEMENT_NOT_FOUND');
      }

      if (openMovement.status !== MovementStatus.PRESENT) {
        throw new Error('MOVEMENT_NOT_OPEN');
      }

      const durationMinutes = Math.max(
        1,
        Math.round((now.getTime() - openMovement.entryAt.getTime()) / (1000 * 60)),
      );

      const updatedMovement = await tx.guardhouseVehicleMovement.update({
        where: {
          id: openMovement.id,
        },
        data: {
          exitAt: now,
          durationMinutes,
          status: MovementStatus.FINISHED,
          exitNotes: exitNotes ?? null,
          registeredByExitId: authUser.id,
        },
        include: movementInclude,
      });

      await tx.guardhouseParkingSpot.update({
        where: {
          id: openMovement.spotId,
        },
        data: {
          status: SpotStatus.FREE,
        },
      });

      return updatedMovement;
    });

    res.json(movement);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'MOVEMENT_NOT_FOUND') {
        return res.status(404).json({ message: 'Movement not found' });
      }

      if (error.message === 'MOVEMENT_NOT_OPEN') {
        return res.status(409).json({ message: 'Movement already finalized' });
      }
    }

    console.error('Error registering guardhouse exit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addGuardhouseMovementPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const filePath = asString(req.body.filePath);
    if (!filePath) {
      return res.status(400).json({ message: 'filePath is required' });
    }

    const photoTypeRaw = asString(req.body.photoType);
    const photoType = photoTypeRaw && isPhotoType(photoTypeRaw) ? photoTypeRaw : undefined;
    if (photoTypeRaw && !photoType) {
      return res.status(400).json({ message: 'Invalid photo type' });
    }

    await prisma.guardhouseVehicleMovement.findUniqueOrThrow({
      where: {
        id: id as string,
      },
      select: {
        id: true,
      },
    });

    const photo = await prisma.guardhouseMovementPhoto.create({
      data: {
        movementId: id as string,
        photoType: photoType ?? PhotoType.ENTRY,
        filePath,
        description: asString(req.body.description) ?? null,
      },
    });

    res.status(201).json(photo);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return res.status(404).json({ message: 'Movement not found' });
    }

    console.error('Error adding guardhouse movement photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addGuardhouseOccurrence = async (req: AuthRequest, res: Response) => {
  const authUser = getAuthUser(req, res);
  if (!authUser) {
    return;
  }

  try {
    const { id } = req.params;
    const description = asString(req.body.description);
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const occurrenceTypeRaw = asString(req.body.occurrenceType);
    const occurrenceType =
      occurrenceTypeRaw && isOccurrenceType(occurrenceTypeRaw) ? occurrenceTypeRaw : undefined;
    if (occurrenceTypeRaw && !occurrenceType) {
      return res.status(400).json({ message: 'Invalid occurrence type' });
    }

    await prisma.guardhouseVehicleMovement.findUniqueOrThrow({
      where: {
        id: id as string,
      },
      select: {
        id: true,
      },
    });

    const occurrence = await prisma.guardhouseVehicleOccurrence.create({
      data: {
        movementId: id as string,
        occurrenceType: occurrenceType ?? OccurrenceType.NOTE,
        description,
        registeredById: authUser.id,
      },
      include: {
        registeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(occurrence);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return res.status(404).json({ message: 'Movement not found' });
    }

    console.error('Error adding guardhouse occurrence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
