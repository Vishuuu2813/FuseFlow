import mongoose from 'mongoose';

const contactFlowStateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    flowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageFlow',
      required: true,
    },
    currentStepIndex: {
      type: Number,
      default: 0,
    },
    nextExecutionAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
    },
    logs: [
      {
        stepIndex: Number,
        sentAt: Date,
        status: String,
        error: String
      }
    ]
  },
  { timestamps: true }
);

contactFlowStateSchema.index({ nextExecutionAt: 1, status: 1 });
contactFlowStateSchema.index({ contactId: 1, flowId: 1 }, { unique: true });

const ContactFlowState = mongoose.model('ContactFlowState', contactFlowStateSchema);
export default ContactFlowState;
