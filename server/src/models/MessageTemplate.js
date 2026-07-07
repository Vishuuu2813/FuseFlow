import mongoose from 'mongoose';

const buttonSchema = new mongoose.Schema({
  type: { type: String, enum: ['QUICK_REPLY', 'URL', 'CALL'], required: true },
  text: { type: String, required: true },
  value: { type: String } // URL link or phone number
});

const messageTemplateSchema = new mongoose.Schema(
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
    category: {
      type: String,
      enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION', 'CUSTOM'],
      default: 'CUSTOM',
    },
    language: {
      type: String,
      default: 'en',
    },
    type: {
      type: String,
      enum: ['TEXT', 'MEDIA', 'BUTTONS', 'LIST'],
      default: 'TEXT',
    },
    body: {
      type: String,
      required: true,
    },
    header: {
      type: String,
    },
    footer: {
      type: String,
    },
    buttons: [buttonSchema],
    mediaUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

// Ensure unique template names per tenant
messageTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const MessageTemplate = mongoose.model('MessageTemplate', messageTemplateSchema);
export default MessageTemplate;
