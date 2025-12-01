// Redis client - works in both local and Vercel environments
import { Redis } from '@upstash/redis';

let redis;

// In production (Vercel), use Vercel KV or Upstash Redis
// In development, fall back to in-memory storage
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} else {
  // Local development fallback - in-memory store
  const inMemoryStore = new Map();
  
  redis = {
    async get(key) {
      const value = inMemoryStore.get(key);
      return value ? JSON.parse(value) : null;
    },
    async set(key, value) {
      inMemoryStore.set(key, JSON.stringify(value));
      return 'OK';
    },
    async del(key) {
      inMemoryStore.delete(key);
      return 1;
    }
  };
  
  console.log('⚠️  Using in-memory storage (local dev). Words will reset on restart.');
}

export default redis;

