import redis from '../lib/redis.js';

const WORDS_KEY = 'seed-your-voice:words';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  const { word, x, y } = req.body;

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'Coordinates (x, y) are required' });
  }

  if (x < 0 || x > 100 || y < 0 || y > 100) {
    return res.status(400).json({ error: 'Coordinates must be between 0 and 100' });
  }

  const trimmedWord = word.trim();
  
  if (trimmedWord.length === 0) {
    return res.status(400).json({ error: 'Word cannot be empty' });
  }

  if (trimmedWord.length > 50) {
    return res.status(400).json({ error: 'Word is too long (max 50 characters)' });
  }

  try {
    // Get existing words
    let words = await redis.get(WORDS_KEY) || [];

    // Add new word
    const newWord = {
      id: Date.now() + Math.random(),
      word: trimmedWord,
      x: x,
      y: y,
      timestamp: new Date().toISOString()
    };

    words.push(newWord);

    // Keep only last 100 words
    if (words.length > 100) {
      words = words.slice(-100);
    }

    // Save to Redis
    await redis.set(WORDS_KEY, words);

    res.status(200).json({ 
      success: true, 
      word: newWord,
      totalWords: words.length 
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({ error: 'Failed to save word' });
  }
}
