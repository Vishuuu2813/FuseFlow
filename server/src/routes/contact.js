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
import { requireActiveTenant, requireUserPermission } from '../middleware/access.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!allowed.includes(file.mimetype) && !/\.(csv|xlsx)$/i.test(file.originalname)) {
      return cb(new Error('Only CSV and XLSX contact files are allowed.'));
    }
    cb(null, true);
  }
});

router.use(authenticate);
router.use(requireTenant);
router.use(requireActiveTenant);
router.use(requireUserPermission('contacts'));

router.get('/', getContacts);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/import', upload.single('file'), importContacts);

export default router;
