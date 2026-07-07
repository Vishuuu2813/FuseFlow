import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppSession',
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate',
    },
    messageText: {
      type: String, // Custom text if not using template
    },
    mediaUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'],
      default: 'DRAFT',
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

campaignSchema.index({ tenantId: 1, status: 1 });
campaignSchema.index({ scheduledAt: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
