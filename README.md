# Pack

A mobile-first Progressive Web App for remembering the people you meet. Built for speed — save someone in under 15 seconds.

## Features

- **Quick capture** — Add people with minimal typing
- **Full-text search** — Search across all fields (name, company, location, tags, notes, phone, etc.)
- **Interaction timeline** — Track every conversation and follow-up
- **Favorites** — Star important contacts
- **Locations** — Auto-indexed places where you met people
- **Dashboard** — Stats on your network
- **Offline-first** — SQLite storage with PWA support
- **Export/Import** — CSV, JSON, and SQLite backups

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Framer Motion
- SQLite (sql.js on web, Capacitor SQLite on native)
- Capacitor 8 for iOS/Android

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Native Apps

```bash
npm run build
npx cap sync
npx cap open android
npx cap open ios
```

## Design

Dark theme with Okami Designs orange accent (`#F7941D`), rounded cards, large touch targets, optimized for one-handed phone use.

## Architecture

Modular structure prepared for future features:

- Business card scanner / OCR
- AI note summarization
- Voice notes & photo attachments
- Map view
- Follow-up reminders
- Cloud sync & shared databases

## License

Private — Okami Designs
