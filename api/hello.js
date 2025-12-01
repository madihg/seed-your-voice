// Simple test endpoint - no dependencies
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({
    message: 'Hello from Vercel!',
    timestamp: new Date().toISOString(),
    env: {
      hasKV: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      nodeVersion: process.version
    }
  });
}

