// Simple local development server
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 8000;

// In-memory word storage
let words = [];

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/submit-word' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const { word, x, y } = JSON.parse(body);
          if (!word || typeof word !== 'string' || word.trim().length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Word is required' }));
            return;
          }
          
          if (typeof x !== 'number' || typeof y !== 'number') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Coordinates (x, y) are required' }));
            return;
          }
          
          const newWord = {
            id: Date.now() + Math.random(),
            word: word.trim(),
            x: x,
            y: y,
            timestamp: new Date().toISOString()
          };
          words.push(newWord);
          
          if (words.length > 50) words = words.slice(-50);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, word: newWord, totalWords: words.length }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    if (pathname === '/api/get-words' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ words, count: words.length }));
      return;
    }

    if (pathname === '/api/clear-words' && req.method === 'POST') {
      words = [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'All words cleared' }));
      return;
    }

    if (pathname === '/api/generate-song' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { words: wordsList } = JSON.parse(body);
          
          if (!wordsList || !Array.isArray(wordsList) || wordsList.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Words array is required' }));
            return;
          }

          if (!process.env.OPENAI_API_KEY) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'OpenAI API key not configured' }));
            return;
          }

          // Set up SSE
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          const wordList = wordsList.map(w => w.word || w).join(', ');
          const prompt = `A witty French poet whose writing is a mix of Ocean Vuong and Charles Bernstein. Create a short 4-6 line verse using these words: ${wordList}. Be concise and poetic.`;

          // Dynamic import for ESM module
          const { default: OpenAI } = await import('openai');
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a witty French poet whose writing is a mix of Ocean Vuong and Charles Bernstein. Create short, evocative verses.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 150,
            temperature: 0.7,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          }

          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();

        } catch (error) {
          console.error('Error generating song:', error);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🎵 Song Building Server`);
  console.log(`================================`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`\nPages:`);
  console.log(`  Home:      http://localhost:${PORT}/`);
  console.log(`  Audience:  http://localhost:${PORT}/audience.html`);
  console.log(`  Performer: http://localhost:${PORT}/performer.html`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

