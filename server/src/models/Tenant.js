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
      birthdayReminderEnabled: { type: Boolean, default: false },
      birthdayReminderTemplate: { type: String, default: 'Happy Birthday {{name}}! Wishing you a fantastic day ahead! 🎉' },
      birthdayReminderTime: { type: String, default: '09:00' }, // HH:mm local time
      lastBirthdayRunDate: { type: String, default: null }, // 'YYYY-MM-DD'
      anniversaryReminderEnabled: { type: Boolean, default: false },
      anniversaryReminderTemplate: { type: String, default: 'Happy Anniversary {{name}}! Wishing you a wonderful year ahead! 💕' },
      anniversaryReminderTime: { type: String, default: '09:00' }, // HH:mm local time
      lastAnniversaryRunDate: { type: String, default: null }, // 'YYYY-MM-DD'
      reminderSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppSession', default: null }
    },
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
      default: () => Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    },
  },
  { timestamps: true }
);

// Index to search tenants quickly
tenantSchema.index({ name: 'text' });

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
