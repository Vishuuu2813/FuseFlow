import express from 'express';
import multer from 'multer';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  bulkEditContacts,
  bulkDeleteContacts,
  getDuplicates,
  mergeContacts,
  getLists,
  createList,
  deleteList,
  manageListContacts,
  getSegments,
  createSegment,
  deleteSegment,
  getSegmentContacts
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

// CRM Enhancements - Bulk Operations
router.post('/bulk-edit', bulkEditContacts);
router.post('/bulk-delete', bulkDeleteContacts);

// CRM Enhancements - Duplicates & Merges
router.get('/duplicates', getDuplicates);
router.post('/merge', mergeContacts);

// CRM Enhancements - Lists
router.get('/lists', getLists);
router.post('/lists', createList);
router.delete('/lists/:id', deleteList);
router.post('/lists/:id/contacts', manageListContacts);

// CRM Enhancements - Segments
router.get('/segments', getSegments);
router.post('/segments', createSegment);
router.delete('/segments/:id', deleteSegment);
router.get('/segments/:id/contacts', getSegmentContacts);

export default router;
