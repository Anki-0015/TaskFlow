import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimit } from '../middleware/security';

const router = Router();

router.post('/register', authRateLimit,  AuthController.register);
router.post('/login', authRateLimit,     AuthController.login);
router.post('/logout',    AuthController.logout);
router.post('/forgot-password', authRateLimit, AuthController.forgotPassword);
router.post('/reset-password', authRateLimit, AuthController.resetPassword);
router.get('/me',         authenticate, AuthController.getMe);
router.put('/profile',    authenticate, AuthController.updateProfile);

export default router;
