import MessageFlow from '../models/MessageFlow.js';
import ContactFlowState from '../models/ContactFlowState.js';
import Contact from '../models/Contact.js';
import Tenant from '../models/Tenant.js';

export const getFlows = async (req, res, next) => {
  try {
    const flows = await MessageFlow.find({ tenantId: req.tenantId })
      .populate('whatsappSessionId', 'sessionName')
      .sort({ createdAt: -1 });
    res.json(flows);
  } catch (error) {
    next(error);
  }
};

export const createFlow = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.flowBuilder === false) {
      return res.status(403).json({ message: 'Flow Builder feature is disabled for your plan. Please upgrade.' });
    }

    const { name, whatsappSessionId, triggerKeywords, steps, isActive } = req.body;

    if (!name || !whatsappSessionId) {
      return res.status(400).json({ message: 'Flow name and WhatsApp session are required.' });
    }

    const flow = await MessageFlow.create({
      tenantId: req.tenantId,
      name,
      whatsappSessionId,
      triggerKeywords: triggerKeywords || [],
      steps: steps || [],
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(flow);
  } catch (error) {
    next(error);
  }
};

export const updateFlow = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.flowBuilder === false) {
      return res.status(403).json({ message: 'Flow Builder feature is disabled for your plan. Please upgrade.' });
    }

    const { name, whatsappSessionId, triggerKeywords, steps, isActive } = req.body;
    
    const flow = await MessageFlow.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found.' });
    }

    if (name !== undefined) flow.name = name;
    if (whatsappSessionId !== undefined) flow.whatsappSessionId = whatsappSessionId;
    if (triggerKeywords !== undefined) flow.triggerKeywords = triggerKeywords;
    if (steps !== undefined) flow.steps = steps;
    if (isActive !== undefined) flow.isActive = isActive;

    await flow.save();
    res.json(flow);
  } catch (error) {
    next(error);
  }
};

export const deleteFlow = async (req, res, next) => {
  try {
    const flow = await MessageFlow.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found.' });
    }

    // Also clean up any active states associated with this flow
    await ContactFlowState.deleteMany({ flowId: flow._id });

    res.json({ message: 'Flow deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const enrollContact = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);
    if (tenant && tenant.limits && tenant.limits.flowBuilder === false) {
      return res.status(403).json({ message: 'Flow Builder feature is disabled for your plan. Please upgrade.' });
    }

    const { contactId } = req.body;
    const flowId = req.params.id;

    const flow = await MessageFlow.findOne({ _id: flowId, tenantId: req.tenantId });
    if (!flow || !flow.isActive) {
      return res.status(404).json({ message: 'Active flow not found.' });
    }

    const contact = await Contact.findOne({ _id: contactId, tenantId: req.tenantId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found.' });
    }

    // Upsert or restart enrollment
    let state = await ContactFlowState.findOne({ contactId, flowId });
    const firstStepDelay = flow.steps[0]?.delaySeconds || 0;

    if (state) {
      state.currentStepIndex = 0;
      state.nextExecutionAt = new Date(Date.now() + firstStepDelay * 1000);
      state.status = 'RUNNING';
      await state.save();
    } else {
      state = await ContactFlowState.create({
        tenantId: req.tenantId,
        contactId,
        flowId,
        currentStepIndex: 0,
        nextExecutionAt: new Date(Date.now() + firstStepDelay * 1000),
        status: 'RUNNING'
      });
    }

    res.json({ message: 'Contact enrolled in flow successfully.', state });
  } catch (error) {
    next(error);
  }
};

export const getFlowStats = async (req, res, next) => {
  try {
    const flowId = req.params.id;
    const flow = await MessageFlow.findOne({ _id: flowId, tenantId: req.tenantId });
    if (!flow) {
      return res.status(404).json({ message: 'Flow not found.' });
    }

    const totalEnrolled = await ContactFlowState.countDocuments({ flowId });
    const activeEnrolled = await ContactFlowState.countDocuments({ flowId, status: 'RUNNING' });
    const completedEnrolled = await ContactFlowState.countDocuments({ flowId, status: 'COMPLETED' });
    const failedEnrolled = await ContactFlowState.countDocuments({ flowId, status: 'FAILED' });

    res.json({
      flow,
      stats: {
        total: totalEnrolled,
        active: activeEnrolled,
        completed: completedEnrolled,
        failed: failedEnrolled
      }
    });
  } catch (error) {
    next(error);
  }
};
