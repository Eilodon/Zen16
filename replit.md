# Thầy.AI - Quantum Zen Companion

## Overview
Thầy.AI is a mindfulness companion web app inspired by Thích Nhất Hạnh. It uses Google's Gemini AI to provide real-time zen guidance through voice and text interactions, with 3D visualizations and breathing exercises.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (CDN), custom CSS animations
- **3D**: Three.js via @react-three/fiber and @react-three/drei
- **Audio**: Tone.js, Web Audio API
- **AI**: Google Gemini API (@google/genai)
- **State**: Zustand
- **Storage**: IndexedDB (client-side)

## Project Structure
```
/                     - Root project files
├── App.tsx           - Main application component
├── index.tsx         - React entry point
├── index.html        - HTML template with Tailwind CDN
├── vite.config.ts    - Vite configuration
├── types.ts          - TypeScript type definitions
├── components/       - React components (AudioEngine, BreathingCircle, OrbViz, etc.)
├── services/         - Service modules (Gemini AI, audio, IndexedDB)
├── hooks/            - Custom React hooks (useZenSession, usePermissions)
├── store/            - Zustand state stores
├── data/             - Static data (emergency keywords)
├── utils/            - Design system utilities
└── dist/             - Build output
```

## Configuration
- Vite dev server runs on port 5000 (0.0.0.0)
- `process.env.API_KEY` is mapped to `import.meta.env.VITE_GEMINI_API_KEY` via Vite define
- Set `VITE_GEMINI_API_KEY` environment variable to use Gemini AI features
- Deployment: static site from `dist/` directory

## Recent Changes
- 2026-02-13: Adapted project for Replit environment
  - Removed CDN import map from index.html (using Vite bundling instead)
  - Added Vite module entry point script tag
  - Cleaned up duplicate dependencies in package.json
  - Configured Vite with allowedHosts, port 5000, and process.env.API_KEY mapping
