import { Router } from 'express';
import {
  checkFirstAccess,
  completeFirstAccess,
  login,
  loginAdmin,
  register,
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/admin/login', loginAdmin);
router.post('/first-access/check', checkFirstAccess);
router.post('/first-access/complete', completeFirstAccess);
router.post('/register', authenticate, authorize(['ADMIN']), register);

export default router;
