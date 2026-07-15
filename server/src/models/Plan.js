import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    deviceLimit: {
      type: Number,
      required: true,
      default: 1,
    },
    maxContacts: {
      type: Number,
      required: true,
      default: 1000,
    },
    maxMessagesPerMonth: {
      type: Number,
      required: true,
      default: 500,
    },
    maxAiCredits: {
      type: Number,
      required: true,
      default: 50,
    },
    maxStorageMb: {
      type: Number,
      required: true,
      default: 100,
    },
    dailyMessageLimit: {
      type: Number,
      required: true,
      default: 100,
    },
    defaultDelaySeconds: {
      type: Number,
      required: true,
      default: 5,
    },
    validityDays: {
      type: Number,
      required: true,
      default: 30,
    },
    bulkScheduling: {
      type: Boolean,
      required: true,
      default: true,
    },
    flowBuilder: {
      type: Boolean,
      required: true,
      default: true,
    },
    aiAutoReply: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
