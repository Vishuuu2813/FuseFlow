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
    mediaAttachments: [
      {
        url: { type: String, required: true },
        fileType: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
        filename: { type: String, default: '' },
        mimetype: { type: String, default: '' }
      }
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'],
      default: 'DRAFT',
    },
    delaySeconds: {
      type: Number,
      default: 5,
    },
    targetCriteria: {
      type: {
        type: String,
        enum: ['ALL', 'STAGE', 'TAG', 'MANUAL'],
        default: 'ALL',
      },
      stage: { type: String, default: '' },
      tag: { type: String, default: '' },
      contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
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
      clicks: { type: Number, default: 0 },
    },
    buttons: [
      {
        type: { type: String, enum: ['quick_reply', 'cta_url', 'cta_call'], default: 'quick_reply' },
        displayText: { type: String, required: true },
        payload: { type: String, default: '' },
      }
    ],
  },
  { timestamps: true }
);

campaignSchema.index({ tenantId: 1, status: 1 });
campaignSchema.index({ scheduledAt: 1 });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;
