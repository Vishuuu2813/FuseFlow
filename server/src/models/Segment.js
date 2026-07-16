import mongoose from 'mongoose';

const segmentSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
      default: '',
    },
    filters: {
      stage: { type: String, default: '' },
      tag: { type: String, default: '' },
      search: { type: String, default: '' },
      minLeadScore: { type: Number, default: null },
      maxLeadScore: { type: Number, default: null },
      minCustomerScore: { type: Number, default: null },
      maxCustomerScore: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// Unique segment name per tenant
segmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const ContactSegment = mongoose.model('ContactSegment', segmentSchema);
export default ContactSegment;
