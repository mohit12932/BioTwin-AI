const { mongoose } = require('./mongo');

const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI for compatibility
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/biotwin';
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable: ${error.message}. Starting in-memory fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const fallbackUri = mongoServer.getUri();
      const conn = await mongoose.connect(fallbackUri);
      console.log(`In-memory MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (memErr) {
      console.error(`In-memory MongoDB failed: ${memErr.message}`);
      return false;
    }
  }
};

module.exports = connectDB;
