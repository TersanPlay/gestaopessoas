import express from 'express';
import { getVisitorByCpf, createVisit, finishVisit, getDepartments, getActiveVisits, faceMatch } from '../controllers/totemController.js';

const router = express.Router();

// Public routes for Totem (no auth middleware for simplicity/requirements)
router.get('/visitors/:cpf', getVisitorByCpf);
router.get('/departments', getDepartments);
router.post('/visits', createVisit);
router.post('/visits/finish', finishVisit);
router.get('/visits/active/:identifier', getActiveVisits);
router.post('/face-match', faceMatch);

export default router;
