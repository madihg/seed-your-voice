// In-memory storage for words (will reset on function cold start)
// For production, consider using Vercel KV or similar
let words = [];

export default function handler(req, res) {
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

  // Add word with timestamp and coordinates
  const newWord = {
    id: Date.now() + Math.random(),
    word: trimmedWord,
    x: x,
    y: y,
    timestamp: new Date().toISOString()
  };

  words.push(newWord);

  // Keep only last 50 words
  if (words.length > 50) {
    words = words.slice(-50);
  }

  res.status(200).json({ 
    success: true, 
    word: newWord,
    totalWords: words.length 
  });
}

