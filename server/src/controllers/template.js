import MessageTemplate from '../models/MessageTemplate.js';
import { writeAuditLog } from '../services/audit.js';

export const getTemplates = async (req, res, next) => {
  try {
    const templates = await MessageTemplate.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const { name, category, language, type, body, header, footer, buttons, mediaUrl, keywords, accuracy } = req.body;
    if (!name || !body) {
      return res.status(400).json({ message: 'Template name and body content are required.' });
    }

    // Check uniqueness
    const existing = await MessageTemplate.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return res.status(400).json({ message: `A template named "${name}" already exists.` });
    }

    const template = await MessageTemplate.create({
      tenantId: req.tenantId,
      name,
      category: category || 'CUSTOM',
      language: language || 'en',
      type: type || 'TEXT',
      body,
      header,
      footer,
      buttons: buttons || [],
      mediaUrl,
      keywords: keywords || [],
      accuracy: accuracy ?? 80
    });

    await writeAuditLog(req, {
      action: 'TEMPLATE_CREATED',
      entityType: 'MessageTemplate',
      entityId: template._id,
      metadata: { name: template.name }
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const { category, language, type, body, header, footer, buttons, mediaUrl, keywords, accuracy } = req.body;
    const template = await MessageTemplate.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    if (category !== undefined) template.category = category;
    if (language !== undefined) template.language = language;
    if (type !== undefined) template.type = type;
    if (body !== undefined) template.body = body;
    if (header !== undefined) template.header = header;
    if (footer !== undefined) template.footer = footer;
    if (buttons !== undefined) template.buttons = buttons;
    if (mediaUrl !== undefined) template.mediaUrl = mediaUrl;
    if (keywords !== undefined) template.keywords = keywords;
    if (accuracy !== undefined) template.accuracy = Number(accuracy);

    await template.save();

    await writeAuditLog(req, {
      action: 'TEMPLATE_UPDATED',
      entityType: 'MessageTemplate',
      entityId: template._id,
      metadata: { name: template.name }
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await MessageTemplate.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    await writeAuditLog(req, {
      action: 'TEMPLATE_DELETED',
      entityType: 'MessageTemplate',
      entityId: template._id,
      metadata: { name: template.name }
    });

    res.json({ message: 'Template deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
