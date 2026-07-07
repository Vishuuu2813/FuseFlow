import AutoReply from '../models/AutoReply.js';

export const getRules = async (req, res, next) => {
  try {
    const rules = await AutoReply.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(rules);
  } catch (error) {
    next(error);
  }
};

export const createRule = async (req, res, next) => {
  try {
    const { keywords, matchType, replyText, mediaUrl, replyMode } = req.body;

    if (!keywords || !keywords.length || !replyText) {
      return res.status(400).json({ message: 'Keywords and reply text are required.' });
    }

    const rule = await AutoReply.create({
      tenantId: req.tenantId,
      keywords: keywords.map((k) => k.toLowerCase().trim()),
      matchType: matchType || 'EXACT',
      replyText,
      mediaUrl: mediaUrl || '',
      replyMode: replyMode || 'STATIC',
    });

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
};

export const updateRule = async (req, res, next) => {
  try {
    const { keywords, matchType, replyText, mediaUrl, replyMode, isActive } = req.body;
    const rule = await AutoReply.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!rule) {
      return res.status(404).json({ message: 'Rule not found.' });
    }

    if (keywords) rule.keywords = keywords.map((k) => k.toLowerCase().trim());
    if (matchType) rule.matchType = matchType;
    if (replyText) rule.replyText = replyText;
    if (mediaUrl !== undefined) rule.mediaUrl = mediaUrl;
    if (replyMode) rule.replyMode = replyMode;
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();
    res.json(rule);
  } catch (error) {
    next(error);
  }
};

export const deleteRule = async (req, res, next) => {
  try {
    const rule = await AutoReply.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found.' });
    }
    res.json({ message: 'Auto-reply rule deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
