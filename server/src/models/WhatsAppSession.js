import mongoose from 'mongoose';

const whatsappSessionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DISCONNECTED', 'CONNECTING', 'QR', 'CONNECTED'],
      default: 'DISCONNECTED',
    },
    phone: {
      type: String,
      trim: true,
    },
    qrCode: {
      type: String, // Raw QR string to render
    },
    creds: {
      type: Object, // Holds the main credentials object (creds.json equivalent)
    },
  },
  { timestamps: true }
);

// Indexes
whatsappSessionSchema.index({ tenantId: 1 });
whatsappSessionSchema.index({ status: 1 });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);
export default WhatsAppSession;
