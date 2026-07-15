import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false, // Optional for global admin accounts
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Manager', 'Employee', 'Support', 'Customer'],
      default: 'Employee',
    },
    permissions: {
      sendMessage: { type: Boolean, default: true },
      sendMessageNote: { type: String, default: '' },
      sendMessageExpiresAt: { type: Date, default: null },

      bulkScheduling: { type: Boolean, default: true },
      bulkSchedulingNote: { type: String, default: '' },
      bulkSchedulingExpiresAt: { type: Date, default: null },

      smartBroadcast: { type: Boolean, default: true },
      smartBroadcastNote: { type: String, default: '' },
      smartBroadcastExpiresAt: { type: Date, default: null },

      flowBuilder: { type: Boolean, default: true },
      flowBuilderNote: { type: String, default: '' },
      flowBuilderExpiresAt: { type: Date, default: null },

      aiAutoReply: { type: Boolean, default: true },
      aiAutoReplyNote: { type: String, default: '' },
      aiAutoReplyExpiresAt: { type: Date, default: null },

      messageLogs: { type: Boolean, default: true },
      messageLogsNote: { type: String, default: '' },
      messageLogsExpiresAt: { type: Date, default: null },

      contacts: { type: Boolean, default: true },
      contactsNote: { type: String, default: '' },
      contactsExpiresAt: { type: Date, default: null },

      kb: { type: Boolean, default: true },
      kbNote: { type: String, default: '' },
      kbExpiresAt: { type: Date, default: null }
    },
    permissionAuditLogs: [
      {
        changedBy: { type: String },
        action: { type: String },
        note: { type: String },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password helper method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Indexing for faster lookups
userSchema.index({ tenantId: 1 });

const User = mongoose.model('User', userSchema);
export default User;
