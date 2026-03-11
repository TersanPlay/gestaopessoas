import express from 'express';
import { getVisitReport, getReportStats } from '../controllers/reportController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

// Middleware to restrict access to ADMIN only
const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

router.use(requireAdmin);

router.get('/visits', getVisitReport);
router.get('/stats', getReportStats);

export default router;
