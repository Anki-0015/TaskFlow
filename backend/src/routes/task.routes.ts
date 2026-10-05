import { Router } from 'express';
import * as TaskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/',              TaskController.getTasks);
router.get('/:id',           TaskController.getTaskById);
router.post('/',             TaskController.createTask);
router.put('/:id',           TaskController.updateTask);
router.delete('/:id',        TaskController.deleteTask);
router.patch('/:id/status',  TaskController.patchTaskStatus);

export default router;
