import mongoose from 'mongoose';
import Contact from '../models/Contact.js';
import Tenant from '../models/Tenant.js';
import ExcelJS from 'exceljs';
import ContactList from '../models/List.js';
import ContactSegment from '../models/Segment.js';
import MessageLog from '../models/MessageLog.js';

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
    const { name, phone, tags, labels, stage, variables, isPinned, isArchived, isMuted, mutedUntil, assignedAgentId, notes, internalNotes, customFields, customerScore, leadScore, birthday, anniversary } = req.body;
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
        isPinned: isPinned || false,
        isArchived: isArchived || false,
        isMuted: isMuted || false,
        mutedUntil: mutedUntil || null,
        assignedAgentId: assignedAgentId || null,
        customFields: customFields || {},
        customerScore: customerScore || 0,
        leadScore: leadScore || 0,
        birthday: birthday || null,
        anniversary: anniversary || null,
      });
      return res.json(contact);
    }

    if (name) contact.name = name;
    if (phone) contact.phone = phone.replace(/[^0-9]/g, '');
    if (tags) contact.tags = tags;
    if (labels) contact.labels = labels;
    if (stage) contact.stage = stage;
    if (variables) contact.variables = variables;
    if (typeof isPinned === 'boolean') contact.isPinned = isPinned;
    if (typeof isArchived === 'boolean') contact.isArchived = isArchived;
    if (typeof isMuted === 'boolean') contact.isMuted = isMuted;
    if (mutedUntil !== undefined) contact.mutedUntil = mutedUntil;
    if (assignedAgentId !== undefined) contact.assignedAgentId = assignedAgentId;
    if (notes) contact.notes = notes;
    if (internalNotes) contact.internalNotes = internalNotes;
    if (customFields) contact.customFields = customFields;
    if (customerScore !== undefined) contact.customerScore = Math.max(0, Math.min(100, Number(customerScore)));
    if (leadScore !== undefined) contact.leadScore = Math.max(0, Math.min(100, Number(leadScore)));
    if (birthday !== undefined) contact.birthday = birthday ? new Date(birthday) : null;
    if (anniversary !== undefined) contact.anniversary = anniversary ? new Date(anniversary) : null;

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

// Bulk Edit Contacts
export const bulkEditContacts = async (req, res, next) => {
  try {
    const { contactIds, stage, tagsToAdd, tagsToRemove, assignedAgentId } = req.body;
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ message: 'No contact IDs provided.' });
    }

    const update = {};
    if (stage) update.stage = stage;
    if (assignedAgentId !== undefined) update.assignedAgentId = assignedAgentId || null;

    const query = { _id: { $in: contactIds }, tenantId: req.tenantId };
    
    // First apply basic updates
    if (Object.keys(update).length > 0) {
      await Contact.updateMany(query, { $set: update });
    }

    // Apply tag operations
    if (tagsToAdd && Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
      await Contact.updateMany(query, { $addToSet: { tags: { $each: tagsToAdd } } });
    }
    if (tagsToRemove && Array.isArray(tagsToRemove) && tagsToRemove.length > 0) {
      await Contact.updateMany(query, { $pull: { tags: { $in: tagsToRemove } } });
    }

    res.json({ message: `Successfully updated ${contactIds.length} contacts.` });
  } catch (error) {
    next(error);
  }
};

// Bulk Delete Contacts
export const bulkDeleteContacts = async (req, res, next) => {
  try {
    const { contactIds } = req.body;
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ message: 'No contact IDs provided.' });
    }

    const result = await Contact.deleteMany({
      _id: { $in: contactIds },
      tenantId: req.tenantId
    });

    // Also remove from any ContactLists
    await ContactList.updateMany(
      { tenantId: req.tenantId },
      { $pull: { contacts: { $in: contactIds } } }
    );

    res.json({ message: `Successfully deleted ${result.deletedCount} contacts.` });
  } catch (error) {
    next(error);
  }
};

// Duplicate Detection
export const getDuplicates = async (req, res, next) => {
  try {
    // Detect duplicates by name (same lowercase name)
    const duplicates = await Contact.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId) } },
      {
        $group: {
          _id: { $toLower: "$name" },
          count: { $sum: 1 },
          contacts: { $push: { id: "$_id", name: "$name", phone: "$phone", stage: "$stage", createdAt: "$createdAt" } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json(duplicates);
  } catch (error) {
    next(error);
  }
};

// Merge Contacts
export const mergeContacts = async (req, res, next) => {
  try {
    const { primaryId, secondaryId } = req.body;
    if (!primaryId || !secondaryId) {
      return res.status(400).json({ message: 'Primary and Secondary contact IDs are required.' });
    }

    const primary = await Contact.findOne({ _id: primaryId, tenantId: req.tenantId });
    const secondary = await Contact.findOne({ _id: secondaryId, tenantId: req.tenantId });

    if (!primary || !secondary) {
      return res.status(404).json({ message: 'One or both contacts not found.' });
    }

    // Merge tags & labels
    const mergedTags = Array.from(new Set([...(primary.tags || []), ...(secondary.tags || [])]));
    const mergedLabels = Array.from(new Set([...(primary.labels || []), ...(secondary.labels || [])]));

    // Merge notes
    const mergedNotes = [...(primary.notes || []), ...(secondary.notes || [])];
    const mergedInternalNotes = [...(primary.internalNotes || []), ...(secondary.internalNotes || [])];

    // Merge customFields and variables
    const mergedCustomFields = new Map([
      ...Object.entries(secondary.customFields || {}),
      ...Object.entries(primary.customFields || {})
    ]);
    const mergedVariables = new Map([
      ...Object.entries(secondary.variables || {}),
      ...Object.entries(primary.variables || {})
    ]);

    // Keep primary's stage, unless secondary is 'won'
    const finalStage = primary.stage === 'won' ? 'won' : secondary.stage === 'won' ? 'won' : primary.stage;

    // Save primary contact
    primary.tags = mergedTags;
    primary.labels = mergedLabels;
    primary.notes = mergedNotes;
    primary.internalNotes = mergedInternalNotes;
    primary.customFields = mergedCustomFields;
    primary.variables = mergedVariables;
    primary.stage = finalStage;

    if (!primary.birthday && secondary.birthday) primary.birthday = secondary.birthday;
    if (!primary.anniversary && secondary.anniversary) primary.anniversary = secondary.anniversary;

    await primary.save();

    // Re-link MessageLogs from secondary's phone to primary's phone or ID if possible
    if (primary.phone !== secondary.phone) {
      await MessageLog.updateMany(
        { tenantId: req.tenantId, phone: secondary.phone },
        { $set: { phone: primary.phone } }
      );
    }

    // Delete secondary contact
    await Contact.deleteOne({ _id: secondaryId });

    // Remove secondary contact from any ContactLists, add primary contact to them
    await ContactList.updateMany(
      { tenantId: req.tenantId, contacts: secondaryId },
      { 
        $pull: { contacts: secondaryId },
        $addToSet: { contacts: primaryId }
      }
    );

    res.json({ message: 'Contacts merged successfully.', primary });
  } catch (error) {
    next(error);
  }
};

// Lists CRUD
export const getLists = async (req, res, next) => {
  try {
    const lists = await ContactList.find({ tenantId: req.tenantId })
      .populate('contacts', 'name phone stage tags')
      .sort({ createdAt: -1 });
    res.json(lists);
  } catch (error) {
    next(error);
  }
};

export const createList = async (req, res, next) => {
  try {
    const { name, description, contactIds } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'List name is required.' });
    }

    const existing = await ContactList.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return res.status(400).json({ message: 'List with this name already exists.' });
    }

    const list = await ContactList.create({
      tenantId: req.tenantId,
      name,
      description: description || '',
      contacts: contactIds || [],
    });

    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
};

export const deleteList = async (req, res, next) => {
  try {
    const list = await ContactList.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!list) {
      return res.status(404).json({ message: 'List not found.' });
    }
    res.json({ message: 'List deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const manageListContacts = async (req, res, next) => {
  try {
    const { contactIds, action } = req.body; // action: 'add' | 'remove'
    if (!contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({ message: 'contactIds array is required.' });
    }

    const update = action === 'remove'
      ? { $pull: { contacts: { $in: contactIds } } }
      : { $addToSet: { contacts: { $each: contactIds } } };

    const list = await ContactList.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      { new: true }
    ).populate('contacts', 'name phone stage tags');

    if (!list) {
      return res.status(404).json({ message: 'List not found.' });
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
};

// Segments CRUD
export const getSegments = async (req, res, next) => {
  try {
    const segments = await ContactSegment.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(segments);
  } catch (error) {
    next(error);
  }
};

export const createSegment = async (req, res, next) => {
  try {
    const { name, description, filters } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Segment name is required.' });
    }

    const existing = await ContactSegment.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return res.status(400).json({ message: 'Segment with this name already exists.' });
    }

    const segment = await ContactSegment.create({
      tenantId: req.tenantId,
      name,
      description: description || '',
      filters: filters || {},
    });

    res.status(201).json(segment);
  } catch (error) {
    next(error);
  }
};

export const deleteSegment = async (req, res, next) => {
  try {
    const segment = await ContactSegment.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!segment) {
      return res.status(404).json({ message: 'Segment not found.' });
    }
    res.json({ message: 'Segment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getSegmentContacts = async (req, res, next) => {
  try {
    const segment = await ContactSegment.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!segment) {
      return res.status(404).json({ message: 'Segment not found.' });
    }

    const query = { tenantId: req.tenantId };
    const { stage, tag, search, minLeadScore, maxLeadScore, minCustomerScore, maxCustomerScore } = segment.filters;

    if (stage) query.stage = stage;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Scores
    if (minLeadScore !== null || maxLeadScore !== null) {
      query.leadScore = {};
      if (minLeadScore !== null) query.leadScore.$gte = minLeadScore;
      if (maxLeadScore !== null) query.leadScore.$lte = maxLeadScore;
    }
    if (minCustomerScore !== null || maxCustomerScore !== null) {
      query.customerScore = {};
      if (minCustomerScore !== null) query.customerScore.$gte = minCustomerScore;
      if (maxCustomerScore !== null) query.customerScore.$lte = maxCustomerScore;
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json({ segment, contacts });
  } catch (error) {
    next(error);
  }
};
