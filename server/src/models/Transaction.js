import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ['Stripe', 'Razorpay', 'Manual', 'Trial'],
      default: 'Stripe',
    },
    paymentId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    couponCode: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
