import { Router } from 'express';
import { getVisits, createVisit, updateVisitStatus } from '../controllers/visitController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getVisits);
router.post('/', createVisit);
router.patch('/:id/status', authorize(['ADMIN', 'RECEPCIONISTA', 'COLABORADOR']), updateVisitStatus);

export default router;
