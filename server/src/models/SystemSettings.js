import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema(
  {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    smtpFrom: { type: String, default: 'noreply@fuseflow.com' },

    gatewayMaxRetries: { type: Number, default: 3 },
    gatewayDelayMin: { type: Number, default: 2 },
    gatewayDelayMax: { type: Number, default: 10 },

    openaiKey: { type: String, default: '' },
    openaiModel: { type: String, default: 'gpt-4o-mini' },

    siteTitle: { type: String, default: 'FuseFlow' },
    supportEmail: { type: String, default: 'support@fuseflow.com' },
    logoUrl: { type: String, default: '' },
    enableWhiteLabeling: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// We only ever need one settings document, so we can define a static helper
SystemSettingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);
export default SystemSettings;
