import redis from '../lib/redis.js';

const WORDS_KEY = 'seed-your-voice:words';
const SESSION_KEY = 'seed-your-voice:session';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear words
    await redis.del(WORDS_KEY);
    
    // Increment session ID so everyone can submit again
    const currentSession = await redis.get(SESSION_KEY) || 0;
    const newSession = parseInt(currentSession) + 1;
    await redis.set(SESSION_KEY, newSession);
    
    res.status(200).json({ 
      success: true,
      message: 'All words cleared',
      newSession: newSession
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({ error: 'Failed to clear words' });
  }
}
