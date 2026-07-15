import Contact from '../models/Contact.js';
import Tenant from '../models/Tenant.js';
import ExcelJS from 'exceljs';

const getContactLimit = (tenant) => {
  return tenant?.limits?.maxContacts || tenant?.limits?.maxStorageMb || 1000;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

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
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return res.status(400).json({ message: 'Phone number must contain 8 to 15 digits.' });
    }

    const tenant = await Tenant.findById(req.tenantId);
    const maxContacts = getContactLimit(tenant);
    const existingCount = await Contact.countDocuments({ tenantId: req.tenantId });
    if (existingCount >= maxContacts) {
      return res.status(403).json({ message: `Contact limit reached. Your plan allows ${maxContacts} contacts.` });
    }

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
      consent: {
        optIn: true,
        optInSource: 'manual',
        consentedAt: new Date()
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { name, phone, tags, labels, stage, variables } = req.body;
    let contact;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    if (isObjectId) {
      contact = await Contact.findOne({ _id: req.params.id, tenantId: req.tenantId });
    } else {
      const cleanPhone = req.params.id.replace(/[^0-9]/g, '');
      contact = await Contact.findOne({ phone: cleanPhone, tenantId: req.tenantId });
    }

    if (!contact) {
      // Create a contact automatically if it doesn't exist yet
      const targetPhone = isObjectId ? (phone ? phone.replace(/[^0-9]/g, '') : '') : req.params.id.replace(/[^0-9]/g, '');
      if (!targetPhone) {
        return res.status(400).json({ message: 'Valid phone number is required to create contact.' });
      }
      contact = await Contact.create({
        tenantId: req.tenantId,
        name: name || 'New Contact',
        phone: targetPhone,
        tags: tags || [],
        labels: labels || [],
        stage: stage || 'lead',
        variables: variables || {},
      });
      return res.json(contact);
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

      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim().toLowerCase() || `field_${colNumber}`;
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers (Name, Phone, Tags)
        
        const name = row.getCell(1).value?.toString() || '';
        const phone = row.getCell(2).value?.toString() || '';
        const tagsString = row.getCell(3).value?.toString() || '';

        if (name && phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const tags = tagsString ? tagsString.split(',').map((t) => t.trim()) : [];
          
          // Get extra columns as custom variables
          const variables = {};
          row.eachCell((cell, colNumber) => {
            if (colNumber > 3 && headers[colNumber]) {
              variables[headers[colNumber]] = cell.value?.toString() || '';
            }
          });

          contactsToInsert.push({
            tenantId: req.tenantId,
            name,
            phone: cleanPhone,
            tags,
            variables,
            stage: 'lead',
            consent: {
              optIn: true,
              optInSource: 'import',
              consentedAt: new Date()
            },
          });
        }
      });
    } else if (filename.endsWith('.csv')) {
      const csvText = req.file.buffer.toString('utf-8');
      const lines = csvText.split('\n');

      if (lines.length > 0) {
        const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = parseCsvLine(line);
          const name = parts[0]?.trim();
          const phone = parts[1]?.trim();
          const tagsString = parts[2]?.trim();

          if (name && phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const tags = tagsString ? tagsString.split(';').map((t) => t.trim()) : []; // Split by semicolon for CSV tags
            
            // Get extra columns as custom variables
            const variables = {};
            for (let colIndex = 3; colIndex < parts.length; colIndex++) {
              if (headers[colIndex]) {
                variables[headers[colIndex]] = parts[colIndex] || '';
              }
            }

            contactsToInsert.push({
              tenantId: req.tenantId,
              name,
              phone: cleanPhone,
              tags,
              variables,
              stage: 'lead',
              consent: {
                optIn: true,
                optInSource: 'import',
                consentedAt: new Date()
              },
            });
          }
        }
      }
    }

    if (contactsToInsert.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found in file.' });
    }

    const tenant = await Tenant.findById(req.tenantId);
    const maxContacts = getContactLimit(tenant);
    const existingCount = await Contact.countDocuments({ tenantId: req.tenantId });
    const uniquePhones = [...new Set(contactsToInsert.map((contact) => contact.phone))];
    const existingPhones = await Contact.find({
      tenantId: req.tenantId,
      phone: { $in: uniquePhones }
    }).distinct('phone');
    const existingPhoneSet = new Set(existingPhones);
    const newPhonesCount = uniquePhones.filter((phone) => !existingPhoneSet.has(phone)).length;
    const availableSlots = Math.max(maxContacts - existingCount, 0);

    if (availableSlots <= 0) {
      return res.status(403).json({ message: `Contact limit reached. Your plan allows ${maxContacts} contacts.` });
    }

    if (newPhonesCount > availableSlots) {
      return res.status(403).json({
        message: `Import exceeds contact limit. You can add ${availableSlots} more contact(s) on your current plan.`
      });
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
