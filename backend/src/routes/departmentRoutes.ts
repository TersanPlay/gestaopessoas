import { Router } from 'express';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  syncDepartments,
} from '../controllers/departmentController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getDepartments);
router.post('/sync', authorize(['ADMIN']), syncDepartments);
router.post('/', authorize(['ADMIN']), createDepartment);
router.put('/:id', authorize(['ADMIN']), updateDepartment);
router.delete('/:id', authorize(['ADMIN']), deleteDepartment);

export default router;
