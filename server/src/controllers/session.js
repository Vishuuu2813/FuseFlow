import WhatsAppSession from '../models/WhatsAppSession.js';
import WhatsAppSessionKey from '../models/WhatsAppSessionKey.js';
import Tenant from '../models/Tenant.js';
import MessageLog from '../models/MessageLog.js';
import Contact from '../models/Contact.js';
import AuditLog from '../models/AuditLog.js';
import Plan from '../models/Plan.js';
import Coupon from '../models/Coupon.js';
import Transaction from '../models/Transaction.js';
import { sessions, connectToWhatsApp, disconnectWhatsApp } from '../services/whatsapp.js';
import { writeAuditLog } from '../services/audit.js';

const getUsageWindows = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return { startOfDay, endOfDay, startOfMonth };
};

export const getSessions = async (req, res, next) => {
  try {
    const sessionsList = await WhatsAppSession.find({ tenantId: req.tenantId }).select('-creds');
    res.json(sessionsList);
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req, res, next) => {
  try {
    const { sessionName } = req.body;
    if (!sessionName) {
      return res.status(400).json({ message: 'Session name is required.' });
    }

    // 1. Fetch tenant limits
    const tenant = await Tenant.findById(req.tenantId);
    const existingSessionsCount = await WhatsAppSession.countDocuments({ tenantId: req.tenantId });

    if (existingSessionsCount >= tenant.limits.maxDevices) {
      return res.status(400).json({
        message: `Plan limit exceeded. Your plan allows a maximum of ${tenant.limits.maxDevices} WhatsApp device(s). Upgrade to add more.`
      });
    }

    // 2. Create session
    const newSession = await WhatsAppSession.create({
      tenantId: req.tenantId,
      sessionName,
      status: 'DISCONNECTED',
    });

    await writeAuditLog(req, {
      action: 'WHATSAPP_SESSION_CREATED',
      entityType: 'WhatsAppSession',
      entityId: newSession._id,
      metadata: { sessionName }
    });

    res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
};

export const connectSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOne({ _id: sessionId, tenantId: req.tenantId });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Trigger connection in background (will stream QR code / state over socket.io)
    connectToWhatsApp(req.tenantId, sessionId);

    await writeAuditLog(req, {
      action: 'WHATSAPP_SESSION_CONNECT_STARTED',
      entityType: 'WhatsAppSession',
      entityId: session._id,
      metadata: { sessionName: session.sessionName }
    });

    res.json({ message: 'Connection sequence started.', status: 'CONNECTING' });
  } catch (error) {
    next(error);
  }
};

export const disconnectSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOne({ _id: sessionId, tenantId: req.tenantId });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    await disconnectWhatsApp(sessionId);
    
    // Reset credentials and update status
    session.status = 'DISCONNECTED';
    session.qrCode = null;
    session.creds = null;
    await session.save();

    await WhatsAppSessionKey.deleteMany({ sessionId });

    await writeAuditLog(req, {
      action: 'WHATSAPP_SESSION_DISCONNECTED',
      entityType: 'WhatsAppSession',
      entityId: session._id,
      metadata: { sessionName: session.sessionName }
    });

    res.json({ message: 'Session disconnected successfully.', status: 'DISCONNECTED' });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await WhatsAppSession.findOneAndDelete({ _id: sessionId, tenantId: req.tenantId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    // Disconnect active socket
    await disconnectWhatsApp(sessionId);

    // Delete credentials keys
    await WhatsAppSessionKey.deleteMany({ sessionId });

    await writeAuditLog(req, {
      action: 'WHATSAPP_SESSION_DELETED',
      entityType: 'WhatsAppSession',
      entityId: session._id,
      metadata: { sessionName: session.sessionName }
    });

    res.json({ message: 'Session deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Send a single WhatsApp message
export const sendSingleMessage = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { phone, messageText, mediaUrl } = req.body;

    if (!phone || !messageText) {
      return res.status(400).json({ message: 'Phone number and message text are required.' });
    }

    const session = await WhatsAppSession.findOne({ _id: sessionId, tenantId: req.tenantId });
    if (!session) {
      return res.status(404).json({ message: 'WhatsApp device session not found.' });
    }

    if (session.status !== 'CONNECTED') {
      return res.status(400).json({ message: 'Device is not connected. Connect the device first.' });
    }

    // Verify daily message limits
    const tenant = await Tenant.findById(req.tenantId);
    const dailyLimit = tenant?.limits?.dailyMessageLimit || 100;

    const monthlyLimit = tenant?.limits?.maxMessagesPerMonth || 500;
    const { startOfDay, endOfDay, startOfMonth } = getUsageWindows();

    const sentToday = await MessageLog.countDocuments({
      tenantId: req.tenantId,
      status: 'SENT',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (sentToday >= dailyLimit) {
      return res.status(403).json({
        message: `Daily message quota exceeded. Your plan allows sending up to ${dailyLimit} messages per day.`
      });
    }

    const sentThisMonth = await MessageLog.countDocuments({
      tenantId: req.tenantId,
      status: 'SENT',
      createdAt: { $gte: startOfMonth }
    });

    if (sentThisMonth >= monthlyLimit) {
      return res.status(403).json({
        message: `Monthly message quota exceeded. Your plan allows ${monthlyLimit} messages per month.`
      });
    }

    let sock = sessions[sessionId.toString()];
    if (!sock) {
      sock = await connectToWhatsApp(req.tenantId, sessionId);
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const contact = await Contact.findOne({ tenantId: req.tenantId, phone: cleanPhone });
    if (contact?.consent?.optIn === false) {
      return res.status(403).json({ message: 'This contact has opted out and cannot be messaged.' });
    }

    const formattedJid = `${cleanPhone}@s.whatsapp.net`;
    const messageOptions = {};
    if (mediaUrl) {
      messageOptions.image = { url: mediaUrl };
      messageOptions.caption = messageText;
    } else {
      messageOptions.text = messageText;
    }

    const sentMsg = await sock.sendMessage(formattedJid, messageOptions);

    const log = await MessageLog.create({
      tenantId: req.tenantId,
      whatsappSessionId: sessionId,
      phone,
      messageText,
      mediaUrl,
      status: 'SENT',
      messageId: sentMsg.key.id,
      sentAt: new Date(),
    });

    await Tenant.findByIdAndUpdate(req.tenantId, {
      $inc: { 'usage.messagesSentThisMonth': 1 }
    });

    await writeAuditLog(req, {
      action: 'SINGLE_MESSAGE_SENT',
      entityType: 'MessageLog',
      entityId: log._id,
      metadata: { whatsappSessionId: sessionId, phone: cleanPhone }
    });

    res.json({ success: true, message: 'Message dispatched successfully.', log });
  } catch (error) {
    next(error);
  }
};

// Retrieve latest message logs
export const getMessageLogs = async (req, res, next) => {
  try {
    const logs = await MessageLog.find({ tenantId: req.tenantId })
      .populate('whatsappSessionId', 'sessionName phone')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// Retrieve dashboard metrics for a tenant
export const getDashboardStats = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { startOfDay, endOfDay } = getUsageWindows();

    // 1. Messages Today
    const sentToday = await MessageLog.countDocuments({
      tenantId,
      status: { $in: ['SENT', 'DELIVERED', 'READ'] },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const deliveredToday = await MessageLog.countDocuments({
      tenantId,
      status: { $in: ['DELIVERED', 'READ'] },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const failedToday = await MessageLog.countDocuments({
      tenantId,
      status: 'FAILED',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 2. Success Rate (tenant specific)
    const allTimeSuccessful = await MessageLog.countDocuments({
      tenantId,
      status: { $in: ['SENT', 'DELIVERED', 'READ'] }
    });

    const allTimeFailed = await MessageLog.countDocuments({
      tenantId,
      status: 'FAILED'
    });

    const successRate = (allTimeSuccessful + allTimeFailed) > 0
      ? Math.round((allTimeSuccessful / (allTimeSuccessful + allTimeFailed)) * 100)
      : 0;

    // 3. Weekly trend data for this tenant
    const trendDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      trendDays.push(d);
    }

    const messageTrend = await Promise.all(
      trendDays.map(async (dayDate) => {
        const dayStart = new Date(dayDate);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        const sentCount = await MessageLog.countDocuments({
          tenantId,
          status: { $in: ['SENT', 'DELIVERED', 'READ'] },
          createdAt: { $gte: dayStart, $lte: dayEnd }
        });

        const deliveredCount = await MessageLog.countDocuments({
          tenantId,
          status: { $in: ['DELIVERED', 'READ'] },
          createdAt: { $gte: dayStart, $lte: dayEnd }
        });

        const name = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          name,
          sent: sentCount,
          delivered: deliveredCount,
          replies: 0
        };
      })
    );

    const tenant = await Tenant.findById(tenantId);
    const aiRepliesCount = tenant?.usage?.aiCreditsUsedThisMonth || 0;

    // 4. Recent Chats (dynamic from MessageLog & Contact)
    const recentLogs = await MessageLog.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(30);

    const recentChats = [];
    const seenPhones = new Set();
    for (const log of recentLogs) {
      if (!seenPhones.has(log.phone)) {
        seenPhones.add(log.phone);
        const contact = await Contact.findOne({ tenantId, phone: log.phone });
        recentChats.push({
          name: contact?.name || `+${log.phone}`,
          message: log.messageText || 'Media attachment',
          time: new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          unread: 0,
          status: contact?.stage || 'Lead'
        });
      }
      if (recentChats.length >= 4) break;
    }

    // 5. Recent Activity (dynamic from AuditLog)
    const recentAudits = await AuditLog.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivities = recentAudits.map((log) => {
      let title = log.action.replace(/_/g, ' ');
      title = title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

      let meta = '';
      if (log.action.includes('CAMPAIGN')) {
        meta = `${log.metadata?.campaignName || 'Campaign'} updated by ${log.actorEmail || 'system'}`;
      } else if (log.action.includes('SESSION')) {
        meta = `WhatsApp session updated by ${log.actorEmail || 'system'}`;
      } else {
        meta = `${title} event logged by ${log.actorEmail || 'system'}`;
      }

      const diffMs = new Date() - new Date(log.createdAt);
      const diffMins = Math.floor(diffMs / 60000);
      let timeStr = 'Just now';
      if (diffMins > 0) {
        if (diffMins < 60) {
          timeStr = `${diffMins}m ago`;
        } else {
          const diffHrs = Math.floor(diffMins / 60);
          if (diffHrs < 24) {
            timeStr = `${diffHrs}h ago`;
          } else {
            timeStr = new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        }
      }

      return {
        title,
        meta,
        time: timeStr,
        action: log.action
      };
    });

    res.json({
      successRate,
      messagesToday: {
        sent: sentToday,
        delivered: deliveredToday,
        failed: failedToday
      },
      aiReplies: aiRepliesCount,
      messageTrend,
      recentChats,
      recentActivities
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailablePlans = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    const hasTrial = plans.some(p => p.name.toLowerCase() === 'trial');
    if (!hasTrial) {
      const defaultTrial = {
        _id: 'virtual-trial-id',
        name: 'trial',
        price: 0,
        deviceLimit: 1,
        maxContacts: 1000,
        maxMessagesPerMonth: 500,
        maxAiCredits: 50,
        maxStorageMb: 100,
        dailyMessageLimit: 100,
        defaultDelaySeconds: 5,
        validityDays: 14,
        isVirtual: true
      };
      return res.json([defaultTrial, ...plans]);
    }
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const upgradePlan = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const tenantId = req.tenantId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Workspace/Tenant not found.' });
    }

    let plan;
    if (planId === 'virtual-trial-id') {
      plan = {
        name: 'trial',
        price: 0,
        deviceLimit: 1,
        maxContacts: 1000,
        maxMessagesPerMonth: 500,
        maxAiCredits: 50,
        maxStorageMb: 100,
        dailyMessageLimit: 100,
        defaultDelaySeconds: 5,
        validityDays: 14
      };
    } else {
      plan = await Plan.findById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Selected plan not found.' });
      }
    }

    tenant.plan = plan.name;
    tenant.limits = {
      maxDevices: plan.deviceLimit,
      maxContacts: plan.maxContacts || 1000,
      maxMessagesPerMonth: plan.maxMessagesPerMonth,
      maxAiCredits: plan.maxAiCredits,
      maxStorageMb: plan.maxStorageMb,
      dailyMessageLimit: plan.dailyMessageLimit || 100,
      defaultDelaySeconds: plan.defaultDelaySeconds || 5,
      bulkScheduling: plan.bulkScheduling !== false,
      flowBuilder: plan.flowBuilder !== false,
      aiAutoReply: plan.aiAutoReply !== false
    };

    tenant.planStartDate = new Date();
    const days = plan.validityDays || 30;
    tenant.planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await tenant.save();

    await writeAuditLog(req, {
      action: 'TENANT_PLAN_UPGRADED_BY_USER',
      entityType: 'Tenant',
      entityId: tenant._id,
      tenantId: tenant._id,
      metadata: { plan: plan.name, planExpiresAt: tenant.planExpiresAt }
    });

    res.json({ message: 'Plan upgraded successfully.', tenant });
  } catch (error) {
    next(error);
  }
};

export const clearMessageLogs = async (req, res, next) => {
  try {
    const { days } = req.body;
    if (days === undefined || isNaN(days)) {
      return res.status(450).json({ message: 'Valid number of days is required.' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const result = await MessageLog.deleteMany({
      tenantId: req.tenantId,
      createdAt: { $lt: cutoffDate }
    });

    await writeAuditLog(req, {
      action: 'MESSAGE_LOGS_CLEANUP',
      entityType: 'MessageLog',
      metadata: { days, deletedCount: result.deletedCount }
    });

    res.json({ message: `Successfully cleared ${result.deletedCount} log entries older than ${days} days.`, deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon code.' });
    }

    if (new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: 'This coupon has expired.' });
    }

    if (coupon.uses >= coupon.maxUses) {
      return res.status(400).json({ message: 'This coupon usage limit has been reached.' });
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });
  } catch (error) {
    next(error);
  }
};

export const simulateCheckout = async (req, res, next) => {
  try {
    const { planId, gateway, couponCode } = req.body;
    const tenantId = req.tenantId;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found.' });
    }

    // Calculate pricing
    let originalPrice = plan.price;
    let finalPrice = originalPrice;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
      if (coupon && new Date() <= coupon.expiresAt && coupon.uses < coupon.maxUses) {
        appliedCoupon = coupon;
        if (coupon.discountType === 'PERCENTAGE') {
          finalPrice = Math.max(0, originalPrice - (originalPrice * coupon.discountValue) / 100);
        } else if (coupon.discountType === 'FIXED') {
          finalPrice = Math.max(0, originalPrice - coupon.discountValue);
        }
        
        // Increment coupon uses
        coupon.uses += 1;
        await coupon.save();
      }
    }

    // Mock payment successful - Create invoice record
    const invoiceNum = 'INV-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const mockPaymentId = 'pay_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 6);

    const transaction = await Transaction.create({
      tenantId,
      amount: finalPrice,
      originalAmount: originalPrice,
      planName: plan.name,
      paymentGateway: gateway || 'Stripe',
      paymentId: mockPaymentId,
      status: 'SUCCESS',
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      invoiceNumber: invoiceNum
    });

    // Update Tenant plan info and validity limits
    tenant.plan = plan.name;
    tenant.limits = {
      maxDevices: plan.deviceLimit,
      maxContacts: plan.maxContacts || 1000,
      maxMessagesPerMonth: plan.maxMessagesPerMonth,
      maxAiCredits: plan.maxAiCredits,
      maxStorageMb: plan.maxStorageMb,
      dailyMessageLimit: plan.dailyMessageLimit || 100,
      defaultDelaySeconds: plan.defaultDelaySeconds || 5,
      bulkScheduling: plan.bulkScheduling !== false,
      flowBuilder: plan.flowBuilder !== false,
      aiAutoReply: plan.aiAutoReply !== false
    };

    tenant.planStartDate = new Date();
    const days = plan.validityDays || 30;
    tenant.planExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    tenant.status = 'active';

    await tenant.save();

    await writeAuditLog(req, {
      action: 'TENANT_SUBSCRIPTION_PURCHASED',
      entityType: 'Transaction',
      entityId: transaction._id,
      tenantId: tenant._id,
      metadata: { plan: plan.name, amountPaid: finalPrice, invoiceNumber: invoiceNum }
    });

    res.json({
      message: 'Payment completed successfully!',
      transaction,
      tenant
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await Transaction.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { timeframe = 'monthly' } = req.query;

    // ── helpers ──────────────────────────────────────────────────
    const daysBack = timeframe === 'yearly' ? 365 : timeframe === 'weekly' ? 7 : timeframe === 'daily' ? 1 : 30;
    const since = new Date(); since.setDate(since.getDate() - daysBack); since.setHours(0,0,0,0);

    // ── KPI counts ───────────────────────────────────────────────
    const [totalSent, totalDelivered, totalRead, totalFailed,
           totalContacts, totalCampaigns, totalFlows, totalTemplates,
           incomingTotal] = await Promise.all([
      MessageLog.countDocuments({ tenantId, direction:'OUTGOING', status:{$in:['SENT','DELIVERED','READ']}, createdAt:{$gte:since} }),
      MessageLog.countDocuments({ tenantId, direction:'OUTGOING', status:{$in:['DELIVERED','READ']}, createdAt:{$gte:since} }),
      MessageLog.countDocuments({ tenantId, direction:'OUTGOING', status:'READ', createdAt:{$gte:since} }),
      MessageLog.countDocuments({ tenantId, direction:'OUTGOING', status:'FAILED', createdAt:{$gte:since} }),
      Contact.countDocuments({ tenantId }),
      (async()=>{ try { const C=await import('../models/Campaign.js'); return C.default.countDocuments({tenantId}); } catch(e){return 0;} })(),
      (async()=>{ try { const F=await import('../models/MessageFlow.js'); return F.default.countDocuments({tenantId}); } catch(e){return 0;} })(),
      (async()=>{ try { const T=await import('../models/MessageTemplate.js'); return T.default.countDocuments({tenantId}); } catch(e){return 0;} })(),
      MessageLog.countDocuments({ tenantId, direction:'INCOMING', createdAt:{$gte:since} }),
    ]);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered/totalSent)*100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead/totalDelivered)*100) : 0;

    // ── Daily message trend (last N days) ───────────────────────
    const trendPoints = Math.min(daysBack, 30);
    const messageTrend = [];
    for (let i = trendPoints - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      const [s, r] = await Promise.all([
        MessageLog.countDocuments({ tenantId, direction:'OUTGOING', status:{$in:['SENT','DELIVERED','READ']}, createdAt:{$gte:d,$lte:end} }),
        MessageLog.countDocuments({ tenantId, direction:'INCOMING', createdAt:{$gte:d,$lte:end} }),
      ]);
      messageTrend.push({ name: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), sent:s, received:r });
    }

    // ── Contact growth (new contacts per day, last N days) ──────
    const contactGrowth = [];
    for (let i = Math.min(daysBack,14)-1; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      const count = await Contact.countDocuments({ tenantId, createdAt:{$gte:d,$lte:end} });
      contactGrowth.push({ name: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), contacts:count });
    }

    // ── Contact pipeline funnel ──────────────────────────────────
    const stages = ['lead','contact','demo','negotiation','won','lost'];
    const stageCounts = await Promise.all(stages.map(s => Contact.countDocuments({tenantId, stage:s})));
    const pipelineFunnel = stages.map((name,i) => ({ name: name.charAt(0).toUpperCase()+name.slice(1), value: stageCounts[i] })).filter(s=>s.value>0);

    // ── 7x12 Heatmap (day x 2hr blocks) ─────────────────────────
    const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const heatmapData = [];
    const heatSince = new Date(); heatSince.setDate(heatSince.getDate()-28);
    const allLogs = await MessageLog.find({ tenantId, createdAt:{$gte:heatSince} }, 'createdAt direction').lean();
    const heatMap = {};
    allLogs.forEach(log => {
      const d = new Date(log.createdAt);
      const day = daysOfWeek[d.getDay()===0?6:d.getDay()-1];
      const hour = Math.floor(d.getHours()/2)*2;
      const key = `${day}-${hour}`;
      heatMap[key] = (heatMap[key]||0)+1;
    });
    const maxVal = Math.max(1, ...Object.values(heatMap));
    daysOfWeek.forEach(day => {
      for(let h=0; h<24; h+=2) {
        const key = `${day}-${h}`;
        heatmapData.push({ day, hour:`${String(h).padStart(2,'0')}:00`, count: heatMap[key]||0, intensity: Math.round(((heatMap[key]||0)/maxVal)*100) });
      }
    });

    // ── Top contacts by message count ────────────────────────────
    const topContactsAgg = await MessageLog.aggregate([
      { $match: { tenantId: new (await import('mongoose')).default.Types.ObjectId(tenantId), createdAt:{$gte:since} } },
      { $group: { _id:'$phone', total:{$sum:1}, incoming:{$sum:{$cond:[{$eq:['$direction','INCOMING']},1,0]}} } },
      { $sort: { total:-1 } }, { $limit:5 }
    ]);
    const topContacts = await Promise.all(topContactsAgg.map(async r => {
      const c = await Contact.findOne({tenantId, phone:r._id},{name:1,phone:1}).lean();
      return { name: c?.name||`+${r._id}`, messages: r.total, incoming: r.incoming };
    }));

    res.json({
      kpi: { totalSent, totalDelivered, totalRead, totalFailed, totalContacts, totalCampaigns, totalFlows, totalTemplates, incomingTotal, deliveryRate, readRate },
      messageTrend,
      contactGrowth,
      pipelineFunnel,
      heatmapData,
      topContacts,
    });
  } catch (error) {
    next(error);
  }
};


