import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [{ type: String, trim: true }],
    labels: [{ type: String, trim: true }],
    variables: {
      type: Map,
      of: String,
      default: {},
    },
    stage: {
      type: String,
      enum: ['lead', 'contact', 'demo', 'negotiation', 'won', 'lost'],
      default: 'lead',
    },
    consent: {
      optIn: { type: Boolean, default: true },
      optInSource: { type: String, default: 'manual' },
      consentedAt: { type: Date, default: Date.now },
      optedOutAt: { type: Date, default: null },
      optOutReason: { type: String, default: '' },
    },
    notes: [noteSchema],
    internalNotes: [noteSchema],
    lid: {
      type: String,
      trim: true,
      default: null,
    },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    mutedUntil: { type: Date, default: null },
    assignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
    customerScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    birthday: {
      type: Date,
      default: null,
    },
    anniversary: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure unique phone number per tenant
contactSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
contactSchema.index({ tenantId: 1, lid: 1 });
contactSchema.index({ name: 'text', phone: 'text', tags: 'text' }); // Text index for easy searching

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
