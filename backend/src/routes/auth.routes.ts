import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register',  AuthController.register);
router.post('/login',     AuthController.login);
router.get('/me',         authenticate, AuthController.getMe);
router.put('/profile',    authenticate, AuthController.updateProfile);

export default router;
