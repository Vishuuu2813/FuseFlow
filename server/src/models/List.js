import mongoose from 'mongoose';

const listSchema = new mongoose.Schema(
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
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
      },
    ],
  },
  { timestamps: true }
);

// Unique list name per tenant
listSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const ContactList = mongoose.model('ContactList', listSchema);
export default ContactList;
