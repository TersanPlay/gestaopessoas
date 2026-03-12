import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { createBackup, listBackups, restoreBackup, deleteBackup } from '../controllers/backupController.js';

const router = express.Router();

router.get('/list', authenticate, authorize(['ADMIN']), listBackups);
router.post('/', authenticate, authorize(['ADMIN']), createBackup);
router.post('/restore', authenticate, authorize(['ADMIN']), restoreBackup);
router.delete('/:file', authenticate, authorize(['ADMIN']), deleteBackup);

export default router;
