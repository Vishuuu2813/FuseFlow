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
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'PENDING',
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
  },
  { timestamps: true }
);

// Indexes for analytical report aggregates
messageLogSchema.index({ tenantId: 1, status: 1 });
messageLogSchema.index({ campaignId: 1 });
messageLogSchema.index({ messageId: 1 });

const MessageLog = mongoose.model('MessageLog', messageLogSchema);
export default MessageLog;
