# Vox Mind

AI-powered voice memo app with continuous recording and conversational search (RAG).

## Features

- **Continuous Recording** - No voice activity detection; records until you stop
- **Korean-English Code-Switching** - Seamless multilingual transcription
- **AI Structuring** - Auto-generates title, summary, category, and action items
- **Audio Playback** - Listen to original recordings in memo details
- **RAG Search** - Ask questions and get AI answers with source references

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS
- **Backend**: Hono.js on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Vector Search**: Cloudflare Vectorize
- **STT**: Groq Whisper Large v3 Turbo
- **LLM/Embedding**: Cloudflare Workers AI

## Development

```bash
# Install dependencies
npm install

# Run frontend
npm run dev

# Run workers locally
npm run dev:workers
```

## Deployment

Automatically deploys to Cloudflare Pages/Workers on push to `main` via GitHub Actions.

## License

MIT
