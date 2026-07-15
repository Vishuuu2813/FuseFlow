import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'trial',
    },
    plan: {
      type: String,
      default: 'trial',
    },
    planStartDate: {
      type: Date,
      default: Date.now,
    },
    planExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    },
    limits: {
      maxDevices: { type: Number, default: 1 },
      maxContacts: { type: Number, default: 1000 },
      maxMessagesPerMonth: { type: Number, default: 500 },
      maxAiCredits: { type: Number, default: 50 },
      maxStorageMb: { type: Number, default: 100 },
      dailyMessageLimit: { type: Number, default: 100 },
      defaultDelaySeconds: { type: Number, default: 5 },
      minimumDelaySeconds: { type: Number, default: 3 },
      bulkScheduling: { type: Boolean, default: true },
      flowBuilder: { type: Boolean, default: true },
      aiAutoReply: { type: Boolean, default: true },
      isCustomLimits: { type: Boolean, default: false },
    },
    usage: {
      messagesSentThisMonth: { type: Number, default: 0 },
      aiCreditsUsedThisMonth: { type: Number, default: 0 },
      storageUsedBytes: { type: Number, default: 0 },
    },
    settings: {
      timezone: { type: String, default: 'UTC' },
      autoReplyDelaySeconds: { type: Number, default: 2 },
      aiEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Index to search tenants quickly
tenantSchema.index({ name: 'text' });

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
