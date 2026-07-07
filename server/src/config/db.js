import mongoose from 'mongoose';
import pino from 'pino';
import dns from 'dns';

// Force Google DNS resolution to prevent querySrv issues with local network router configurations
dns.setServers(['8.8.8.8', '8.8.4.4']);

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsflow';
  
  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection disconnected! Attempting reconnect...');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});
