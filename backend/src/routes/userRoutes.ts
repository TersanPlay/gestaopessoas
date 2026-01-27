import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate); // Protect all user routes

router.get('/', authorize(['ADMIN', 'RECEPCIONISTA']), getUsers);
router.get('/:id', getUserById);
router.post('/', authorize(['ADMIN']), createUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize(['ADMIN']), deleteUser);

export default router;
