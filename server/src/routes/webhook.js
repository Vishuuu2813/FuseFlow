import express from 'express';
import Tenant from '../models/Tenant.js';
import Contact from '../models/Contact.js';
import MessageFlow from '../models/MessageFlow.js';
import ContactFlowState from '../models/ContactFlowState.js';

const router = express.Router();

// Incoming Webhook Trigger Endpoint
router.post('/trigger', async (req, res, next) => {
  try {
    // 1. Authenticate via Header or Query Parameter
    const authHeader = req.headers.authorization;
    let apiKey = req.query.apiKey;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.split(' ')[1];
    }

    if (!apiKey) {
      return res.status(401).json({ message: 'Authentication required. Provide apiKey as query param or Bearer token.' });
    }

    const tenant = await Tenant.findOne({ apiKey });
    if (!tenant) {
      return res.status(401).json({ message: 'Invalid API Key.' });
    }

    const tenantId = tenant._id;

    // 2. Validate Body
    const { phone, name, variables, flowId } = req.body;

    if (!phone || !flowId) {
      return res.status(400).json({ message: 'Phone number and flowId are required.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return res.status(400).json({ message: 'Invalid phone number format.' });
    }

    // 3. Find target flow
    const flow = await MessageFlow.findOne({ _id: flowId, tenantId, isActive: true });
    if (!flow) {
      return res.status(404).json({ message: 'Active Message Flow not found.' });
    }

    // 4. Find or Create Contact
    let contact = await Contact.findOne({ tenantId, phone: cleanPhone });
    if (!contact) {
      contact = new Contact({
        tenantId,
        phone: cleanPhone,
        name: name || 'New Contact',
        stage: 'lead',
        consent: {
          optIn: true,
          optInSource: 'webhook',
          consentedAt: new Date()
        }
      });
    } else {
      if (name) contact.name = name;
    }

    // Merge custom variables
    if (variables && typeof variables === 'object') {
      const currentVars = contact.variables || new Map();
      Object.entries(variables).forEach(([key, val]) => {
        currentVars.set(key, String(val));
      });
      contact.variables = currentVars;
    }

    await contact.save();

    // 5. Enroll in Flow
    // Delete existing enrollment to restart clean
    await ContactFlowState.deleteMany({ contactId: contact._id, flowId: flow._id });

    const firstStepDelay = flow.steps[0]?.delaySeconds || 0;
    await ContactFlowState.create({
      tenantId,
      contactId: contact._id,
      flowId: flow._id,
      currentStepIndex: 0,
      nextExecutionAt: new Date(Date.now() + firstStepDelay * 1000),
      status: 'RUNNING',
    });

    res.json({
      status: 'success',
      message: `Contact enrolled in flow sequence '${flow.name}'`,
      contact: {
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
