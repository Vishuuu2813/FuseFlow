import Contact from '../models/Contact.js';
import ExcelJS from 'exceljs';

export const getContacts = async (req, res, next) => {
  try {
    const { search, stage, tag, page = 1, limit = 20 } = req.query;
    const query = { tenantId: req.tenantId };

    if (stage) query.stage = stage;
    if (tag) query.tags = tag;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const { name, phone, tags, labels, stage, variables } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Check duplicate
    const existing = await Contact.findOne({ tenantId: req.tenantId, phone: cleanPhone });
    if (existing) {
      return res.status(400).json({ message: 'Contact with this phone number already exists.' });
    }

    const contact = await Contact.create({
      tenantId: req.tenantId,
      name,
      phone: cleanPhone,
      tags: tags || [],
      labels: labels || [],
      stage: stage || 'lead',
      variables: variables || {},
    });

    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { name, phone, tags, labels, stage, variables } = req.body;
    const contact = await Contact.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found.' });
    }

    if (name) contact.name = name;
    if (phone) contact.phone = phone.replace(/[^0-9]/g, '');
    if (tags) contact.tags = tags;
    if (labels) contact.labels = labels;
    if (stage) contact.stage = stage;
    if (variables) contact.variables = variables;

    await contact.save();
    res.json(contact);
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found.' });
    }
    res.json({ message: 'Contact deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Bulk Import
export const importContacts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel or CSV file.' });
    }

    const contactsToInsert = [];
    const filename = req.file.originalname;

    if (filename.endsWith('.xlsx')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers (Name, Phone, Tags)
        
        const name = row.getCell(1).value?.toString() || '';
        const phone = row.getCell(2).value?.toString() || '';
        const tagsString = row.getCell(3).value?.toString() || '';

        if (name && phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const tags = tagsString ? tagsString.split(',').map((t) => t.trim()) : [];
          
          contactsToInsert.push({
            tenantId: req.tenantId,
            name,
            phone: cleanPhone,
            tags,
            stage: 'lead',
          });
        }
      });
    } else if (filename.endsWith('.csv')) {
      const csvText = req.file.buffer.toString('utf-8');
      const lines = csvText.split('\n');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const name = parts[0]?.trim();
        const phone = parts[1]?.trim();
        const tagsString = parts[2]?.trim();

        if (name && phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const tags = tagsString ? tagsString.split(';').map((t) => t.trim()) : []; // Split by semicolon for CSV tags
          
          contactsToInsert.push({
            tenantId: req.tenantId,
            name,
            phone: cleanPhone,
            tags,
            stage: 'lead',
          });
        }
      }
    }

    if (contactsToInsert.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found in file.' });
    }

    // Insert contacts ignoring duplicates using MongoDB bulkWrite
    const bulkOps = contactsToInsert.map((c) => ({
      updateOne: {
        filter: { tenantId: req.tenantId, phone: c.phone },
        update: { $setOnInsert: c },
        upsert: true,
      },
    }));

    const result = await Contact.bulkWrite(bulkOps);

    res.json({
      message: 'Import processed successfully.',
      inserted: result.upsertedCount,
      matched: result.matchedCount,
    });
  } catch (error) {
    next(error);
  }
};
