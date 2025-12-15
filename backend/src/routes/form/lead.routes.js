import { Router } from 'express';
import { createLead } from '../../controllers/leadController.js';

const router = Router();

// POST /api/leads
// We map the root '/' here, because we will define the prefix '/api/leads' in the server file.
router.post('/', createLead);

export default router;