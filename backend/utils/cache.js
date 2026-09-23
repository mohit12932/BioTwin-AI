const { createClient } = require('redis');

let redisClient;
let isRedisConnected = false;

async function initRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: false // Disable infinite retries for local dev without Redis
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.error('⚠️ Could not connect to Redis. Caching will be disabled.', error.message);
    isRedisConnected = false;
  }
}

async function getCachedConsensus(patientHash) {
  if (!isRedisConnected || !redisClient) return null;
  try {
    const cachedData = await redisClient.get(`consensus:${patientHash}`);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error('Redis GET Error:', error);
    return null;
  }
}

async function setCachedConsensus(patientHash, consensusData, ttlSeconds = 3600) {
  if (!isRedisConnected || !redisClient) return false;
  try {
    await redisClient.setEx(`consensus:${patientHash}`, ttlSeconds, JSON.stringify(consensusData));
    return true;
  } catch (error) {
    console.error('Redis SET Error:', error);
    return false;
  }
}

// Ensure connection is initiated immediately (lazy load also works, but for this let's attempt at boot)
initRedis();

module.exports = {
  getCachedConsensus,
  setCachedConsensus,
  isRedisAvailable: () => isRedisConnected
};
