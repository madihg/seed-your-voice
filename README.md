# Seed Your Voice

An interactive performance tool where audience members suggest words by clicking on their screen, and AI creates poetic songs with live voice modulation.

## Features

- **Interactive Audience Submission**: Click anywhere on screen to place a dot and submit a word
- **Real-time Dot Visualization**: See all audience submissions as dots on a phone preview
- **AI Song Generation**: Ultra-fast streaming song creation using OpenAI GPT-4o-mini
- **Voice Modulation**: Advanced Web Audio API effects controlled by dot positions
- **Dot-to-Voice Mapping**: Spatial positions of dots algorithmically control voice parameters

## Quick Start

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file:
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

3. **Run locally:**
```bash
npm start
```

Access at `http://localhost:9000`:
- Home: `http://localhost:9000`
- Audience: `http://localhost:9000/audience.html`
- Performer: `http://localhost:9000/performer.html`

### Deploy to Vercel

1. **Push to GitHub** (this repo)

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import this repository
   - Add environment variable: `OPENAI_API_KEY`
   - Deploy!

3. **Or use Vercel CLI:**
```bash
npm install -g vercel
vercel --prod
```

## How It Works

### Audience Experience
1. Open the audience page on your phone
2. Click anywhere on the screen
3. A pulsating dot appears at that location
4. Type your word and hit "DONE"
5. See all dots and words from other audience members
6. Each person can only submit once

### Performer Experience
1. Open the performer dashboard
2. Share QR code with audience
3. Watch dots appear in the phone preview
4. Click "GENERATE SONG" for AI poetry
5. Click "GENERATE VOICE" to map dot positions to voice parameters
6. Watch sliders animate to new settings
7. Start voice modulation and perform!

## Dot-to-Voice Mapping

The spatial positions of audience dots control voice parameters:

- **Average X position (left-right)**: Controls pitch shift & filter frequency
- **Average Y position (top-bottom)**: Controls reverb mix & delay time
- **Dot spread/density**: Controls distortion & whisper effect

Click "GENERATE VOICE" to see all sliders animate to positions calculated from the dot constellation!

## Tech Stack

- **Frontend**: Vanilla JavaScript, Web Audio API
- **Backend**: Node.js serverless functions
- **AI**: OpenAI GPT-4o-mini with streaming
- **Deployment**: Vercel
- **Design**: Minimal black & white, Times New Roman, retro web aesthetic

## API Routes

- `POST /api/submit-word` - Submit a word with x,y coordinates
- `GET /api/get-words` - Get all submitted words and coordinates
- `POST /api/generate-song` - Generate song with streaming
- `POST /api/clear-words` - Clear all words

## Poetic Style

Songs are generated with the prompt: *"A witty French poet whose writing is a mix of Ocean Vuong and Charles Bernstein"*

## License

MIT

---

Created for interactive performance art • [GitHub](https://github.com/madihg/seed-your-voice)
