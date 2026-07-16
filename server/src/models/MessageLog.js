import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    whatsappSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppSession',
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    messageText: {
      type: String,
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'location', 'contact', 'text'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED'],
      default: 'PENDING',
    },
    direction: {
      type: String,
      enum: ['INCOMING', 'OUTGOING'],
      default: 'OUTGOING',
    },
    errorReason: {
      type: String,
    },
    messageId: {
      type: String, // WhatsApp message ID
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    starred: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for analytical report aggregates
messageLogSchema.index({ tenantId: 1, status: 1 });
messageLogSchema.index({ campaignId: 1 });
messageLogSchema.index({ messageId: 1 });
messageLogSchema.index({ campaignId: 1, phone: 1 });
messageLogSchema.index({ tenantId: 1, createdAt: -1 });
messageLogSchema.index({ tenantId: 1, phone: 1, direction: 1 });

const MessageLog = mongoose.model('MessageLog', messageLogSchema);
export default MessageLog;
