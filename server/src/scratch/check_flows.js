import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
import MessageFlow from '../models/MessageFlow.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB!');
    const flows = await MessageFlow.find();
    console.log('Flows count:', flows.length);
    flows.forEach(f => {
      console.log(`Flow: ${f.name}`);
      f.steps.forEach((s, idx) => {
        console.log(`  Step ${idx + 1}: ${s.messageText.substring(0, 30)}...`);
        console.log(`    isWaitStep: ${s.isWaitStep}`);
        console.log(`    autoProgress: ${s.autoProgress}`);
        console.log(`    branches:`, s.branches);
      });
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
