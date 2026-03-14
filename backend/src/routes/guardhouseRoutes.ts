import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  addGuardhouseMovementPhoto,
  addGuardhouseOccurrence,
  blockGuardhouseVehicle,
  createGuardhouseDriver,
  createGuardhouseVehicle,
  getGuardhouseDashboardStats,
  getGuardhouseDrivers,
  getGuardhouseLiveFeed,
  getGuardhouseMovementById,
  getGuardhouseMovements,
  getGuardhouseSpots,
  getGuardhouseVehicleById,
  getGuardhouseVehicles,
  registerGuardhouseEntry,
  registerGuardhouseExit,
  unblockGuardhouseVehicle,
  updateGuardhouseSpotStatus,
  updateGuardhouseVehicle,
  uploadGuardhouseVehiclePhoto,
} from '../controllers/guardhouseController.js';

const router = Router();
const uploadVehiclePhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authenticate);

router.get('/dashboard/stats', getGuardhouseDashboardStats);
router.get('/dashboard/live-feed', getGuardhouseLiveFeed);

router.get('/vehicles', getGuardhouseVehicles);
router.post('/vehicles', authorize(['ADMIN', 'RECEPCIONISTA']), createGuardhouseVehicle);
router.get('/vehicles/:id', getGuardhouseVehicleById);
router.patch('/vehicles/:id', authorize(['ADMIN', 'RECEPCIONISTA']), updateGuardhouseVehicle);
router.post(
  '/vehicles/:id/photo',
  authorize(['ADMIN', 'RECEPCIONISTA']),
  uploadVehiclePhoto.single('file'),
  uploadGuardhouseVehiclePhoto,
);
router.post('/vehicles/:id/block', authorize(['ADMIN', 'RECEPCIONISTA']), blockGuardhouseVehicle);
router.patch('/vehicles/:id/unblock', authorize(['ADMIN', 'RECEPCIONISTA']), unblockGuardhouseVehicle);

router.get('/drivers', getGuardhouseDrivers);
router.post('/drivers', authorize(['ADMIN', 'RECEPCIONISTA']), createGuardhouseDriver);

router.get('/spots', getGuardhouseSpots);
router.patch('/spots/:id/status', authorize(['ADMIN', 'RECEPCIONISTA']), updateGuardhouseSpotStatus);

router.get('/movements', getGuardhouseMovements);
router.get('/movements/:id', getGuardhouseMovementById);
router.post('/movements/entry', authorize(['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']), registerGuardhouseEntry);
router.patch('/movements/:id/exit', authorize(['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']), registerGuardhouseExit);
router.post(
  '/movements/:id/photos',
  authorize(['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']),
  addGuardhouseMovementPhoto,
);
router.post(
  '/movements/:id/occurrences',
  authorize(['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']),
  addGuardhouseOccurrence,
);

export default router;
