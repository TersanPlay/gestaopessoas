import { Router } from 'express';
import { getVisitors, createVisitor, updateVisitor, deleteVisitor } from '../controllers/visitorController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getVisitors);
router.post('/', createVisitor);
router.put('/:id', updateVisitor);
router.delete('/:id', deleteVisitor);

export default router;
