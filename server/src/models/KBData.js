import mongoose from 'mongoose';

const kbDataSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['FILE', 'WEBSITE', 'FAQ'],
      required: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
kbDataSchema.index({ tenantId: 1 });
kbDataSchema.index({ title: 'text', content: 'text' }); // Enable text searching for relevant chunks

const KBData = mongoose.model('KBData', kbDataSchema);
export default KBData;
