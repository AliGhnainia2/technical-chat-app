# Technical Chat frontend

This directory contains the standalone Angular client for Technical Chat. It
provides JWT-backed sessions, the real-time contact list, presence updates,
conversation history, and one-to-one STOMP messaging.

## Commands

```bash
npm install
npm start
npm run build
npm test -- --watch=false
```

The development server runs at `http://localhost:4200`. The API base URL is defined
in `src/environments/` and defaults to `http://localhost:8080/api/v1`. The native
WebSocket endpoint defaults to `ws://localhost:8080/ws`.
