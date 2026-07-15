import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tenant from './models/Tenant.js';
import Plan from './models/Plan.js';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsflow';

async function run() {
  try {
    await mongoose.connect(uri, { family: 4 });
    console.log('Connected to MongoDB.');

    const tenants = await Tenant.find();
    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
      console.log(`Processing tenant: ${tenant.companyName || tenant.name} (Plan: ${tenant.plan})`);
      
      const plan = await Plan.findOne({ name: { $regex: new RegExp(`^${tenant.plan}$`, 'i') } });
      
      if (plan) {
        console.log(`Found matching plan: ${plan.name}. Updating limits...`);
        tenant.limits = {
          maxDevices: plan.deviceLimit,
          maxContacts: plan.maxContacts || 1000,
          maxMessagesPerMonth: plan.maxMessagesPerMonth,
          maxAiCredits: plan.maxAiCredits,
          maxStorageMb: plan.maxStorageMb,
          dailyMessageLimit: plan.dailyMessageLimit || 100,
          defaultDelaySeconds: plan.defaultDelaySeconds || 5,
          bulkScheduling: plan.bulkScheduling !== false,
          flowBuilder: plan.flowBuilder !== false,
          aiAutoReply: plan.aiAutoReply !== false
        };
        await tenant.save();
        console.log(`Updated tenant ${tenant.companyName || tenant.name} limits successfully.`);
      } else if (tenant.plan.toLowerCase() === 'trial') {
        console.log(`No trial plan document in DB. Applying virtual trial default limits (1000 contacts)...`);
        tenant.limits = {
          maxDevices: 1,
          maxContacts: 1000,
          maxMessagesPerMonth: 500,
          maxAiCredits: 50,
          maxStorageMb: 100,
          dailyMessageLimit: 100,
          defaultDelaySeconds: 5,
          bulkScheduling: true,
          flowBuilder: true,
          aiAutoReply: true
        };
        await tenant.save();
        console.log(`Updated trial tenant limits.`);
      } else {
        console.log(`No matching plan found for ${tenant.plan}. Skipping.`);
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

run();
