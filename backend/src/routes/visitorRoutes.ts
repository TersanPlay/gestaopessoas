import { Router } from 'express';
import { getVisitors, getVisitorById, createVisitor, updateVisitor, deleteVisitor } from '../controllers/visitorController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getVisitors);
router.get('/:id', getVisitorById);
router.post('/', createVisitor);
router.put('/:id', updateVisitor);
router.delete('/:id', deleteVisitor);

export default router;
