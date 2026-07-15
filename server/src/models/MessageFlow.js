import mongoose from 'mongoose';

const flowStepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  delaySeconds: { type: Number, default: 0 },
  messageText: { type: String, required: true },
  mediaUrl: { type: String, default: '' }
});

const messageFlowSchema = new mongoose.Schema(
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
    triggerKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      }
    ],
    whatsappSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppSession',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    steps: [flowStepSchema]
  },
  { timestamps: true }
);

messageFlowSchema.index({ tenantId: 1, isActive: 1 });

const MessageFlow = mongoose.model('MessageFlow', messageFlowSchema);
export default MessageFlow;
