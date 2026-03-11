import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);

export default router;
