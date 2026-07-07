import mongoose from 'mongoose';

const whatsappSessionKeySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppSession',
      required: true,
    },
    keyId: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for super fast authentication lookups
whatsappSessionKeySchema.index({ sessionId: 1, keyId: 1 }, { unique: true });
whatsappSessionKeySchema.index({ tenantId: 1 });

const WhatsAppSessionKey = mongoose.model('WhatsAppSessionKey', whatsappSessionKeySchema);
export default WhatsAppSessionKey;
