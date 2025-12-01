// Redis client - works in both local and Vercel environments
import { Redis } from '@upstash/redis';

let redis;

// In production (Vercel), use Upstash Redis
// In development, fall back to in-memory storage
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
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

