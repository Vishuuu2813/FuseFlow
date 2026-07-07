import express from 'express';
import multer from 'multer';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts
} from '../controllers/contact.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requireTenant);

router.get('/', getContacts);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/import', upload.single('file'), importContacts);

export default router;
