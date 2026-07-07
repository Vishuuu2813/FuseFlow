import mongoose from 'mongoose';

const autoReplySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    keywords: [
      {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    ],
    matchType: {
      type: String,
      enum: ['EXACT', 'CONTAINS'],
      default: 'EXACT',
    },
    replyText: {
      type: String,
      required: true,
    },
    mediaUrl: {
      type: String,
    },
    replyMode: {
      type: String,
      enum: ['STATIC', 'AI'],
      default: 'STATIC',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
autoReplySchema.index({ tenantId: 1 });

const AutoReply = mongoose.model('AutoReply', autoReplySchema);
export default AutoReply;
