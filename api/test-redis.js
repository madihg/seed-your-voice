import redis from '../lib/redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check if we're using real Redis or in-memory fallback
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    const isProduction = !!(redisUrl && redisToken);
    
    // Test write
    const testKey = 'seed-your-voice:test';
    const testValue = { test: 'Hello from Redis!', timestamp: new Date().toISOString() };
    await redis.set(testKey, testValue);
    
    // Test read
    const readValue = await redis.get(testKey);
    
    // Clean up
    await redis.del(testKey);
    
    res.status(200).json({
      success: true,
      storage: isProduction ? 'Vercel KV / Redis (Production)' : 'In-Memory (Local Dev)',
      environment: {
        hasRedisUrl: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
        hasRedisToken: !!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
        hasOpenAI: !!process.env.OPENAI_API_KEY
      },
      test: {
        written: testValue,
        read: readValue,
        match: JSON.stringify(testValue) === JSON.stringify(readValue)
      },
      message: isProduction 
        ? '✅ Redis (Vercel KV) is connected and working!' 
        : '⚠️ Using in-memory storage (local dev). Deploy to Vercel with KV to use Redis.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

