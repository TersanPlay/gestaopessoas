import { Router } from 'express';
import {
  checkFirstAccess,
  checkEmailFirstAccess,
  completeFirstAccess,
  exchangeInstitutionalSso,
  login,
  loginAdmin,
  register,
  startInstitutionalSso,
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/admin/login', loginAdmin);
router.get('/sso/start', startInstitutionalSso);
router.post('/sso/exchange', exchangeInstitutionalSso);
router.post('/first-access/check', checkFirstAccess);
router.post('/first-access/check-email', checkEmailFirstAccess);
router.post('/first-access/complete', completeFirstAccess);
router.post('/register', authenticate, authorize(['ADMIN']), register);

export default router;
