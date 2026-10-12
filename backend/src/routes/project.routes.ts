import { Router } from 'express';
import * as ProjectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats/dashboard', ProjectController.getDashboardStats);
router.get('/invitations/inbox', ProjectController.getProjectInvitations);
router.patch('/invitations/:invitationId', ProjectController.respondToProjectInvitation);
router.get('/:id/members', ProjectController.getProjectMembers);
router.post('/:id/members', ProjectController.addProjectMember);
router.delete('/:id/members/:memberId', ProjectController.removeProjectMember);
router.get('/',                ProjectController.getProjects);
router.get('/:id',             ProjectController.getProjectById);
router.post('/',               ProjectController.createProject);
router.put('/:id',             ProjectController.updateProject);
router.delete('/:id',          ProjectController.deleteProject);

export default router;
