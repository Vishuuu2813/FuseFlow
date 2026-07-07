import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Employee', 'Support', 'Customer'],
      default: 'Employee',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED'],
      default: 'PENDING',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day expiration
    },
  },
  { timestamps: true }
);

// Indexes
inviteSchema.index({ token: 1 });
inviteSchema.index({ email: 1 });

const Invite = mongoose.model('Invite', inviteSchema);
export default Invite;
