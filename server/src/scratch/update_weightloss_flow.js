import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import dns from 'dns';
import MessageFlow from '../models/MessageFlow.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function updateFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB!');
    
    const flow = await MessageFlow.findOne({ name: /weight/i });
    if (!flow) {
      console.log('Weight loss flow not found!');
      process.exit(1);
    }
    
    console.log('Found flow:', flow.name);
    
    if (flow.steps.length >= 3) {
      // Step 1: Ask meal, wait for branch choice, do not auto progress
      flow.steps[0].isWaitStep = true;
      flow.steps[0].autoProgress = false; 
      flow.steps[0].branches = [
        {
          keywords: ['1', 'breakfast', 'breakfast price'],
          targetStepNumber: 2
        },
        {
          keywords: ['2', 'lunch', 'lunch detail'],
          targetStepNumber: 3
        }
      ];
      
      // Step 2 (Breakfast details): Terminal step, do not auto progress to Step 3
      flow.steps[1].isWaitStep = false;
      flow.steps[1].autoProgress = false; 
      flow.steps[1].branches = [];
      
      // Step 3 (Lunch details): Terminal step, do not auto progress to any other step
      flow.steps[2].isWaitStep = false;
      flow.steps[2].autoProgress = false; 
      flow.steps[2].branches = [];
      
      flow.markModified('steps');
      await flow.save();
      console.log('Flow updated with autoProgress: false on leaf steps!');
    } else {
      console.log('Flow has less than 3 steps.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Update error:', err);
    process.exit(1);
  }
}

updateFlow();
