# Technical Chat

Technical Chat is a one-to-one real-time messaging application developed as a
technical assessment. It combines a Spring Boot API and STOMP server with an
Angular client, using MongoDB for persistence and JWT for authentication.

## Features

- Account registration and login
- Stateless JWT authentication
- Online and offline presence
- User directory and conversation selection
- Persisted conversation history
- Real-time messaging with WebSocket/STOMP
- Responsive desktop and mobile interface
- Structured REST and messaging error handling

## Stack

### Backend

- Java 21
- Spring Boot 3.5.4
- Spring Security and JWT
- Spring Data MongoDB
- WebSocket/STOMP
- Lombok
- MapStruct
- Maven Wrapper
- JUnit, Mockito, MockMvc, and Spring Security Test

### Frontend

- Angular 22 standalone
- TypeScript in strict mode
- RxJS and signals
- Reactive Forms
- SCSS
- STOMP.js
- Vitest

## Project structure

```text
technical-chat/
├── backend/
├── frontend/
├── .gitignore
└── README.md
```

The backend follows a layered architecture with controllers, services,
repositories, DTOs, and mappers. The frontend separates core infrastructure,
routed features, layouts, and shared components.

## Prerequisites

- JDK 21
- MongoDB Community Server or a compatible MongoDB instance
- A Node.js version compatible with Angular 22
- npm

Maven is provided by the project wrapper and does not need to be installed
globally.

## Environment configuration

The backend reads its settings from environment variables. The real
`backend/.env` file is intentionally not committed; create it from the provided
template:

```powershell
cd backend
Copy-Item .env.example .env
```

Replace the sample `JWT_SECRET` with a Base64-encoded 32-byte key. In PowerShell:

```powershell
[Convert]::ToBase64String(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)
```

| Variable | Local default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/technical_chat` | MongoDB connection |
| `JWT_SECRET` | `replace-with-a-base64-encoded-256-bit-secret` | JWT signing key |
| `JWT_EXPIRATION_MS` | `86400000` | Token lifetime in milliseconds |
| `FRONTEND_URL` | `http://localhost:4200` | Allowed frontend origin |
| `SERVER_PORT` | `8080` | Backend port |

Spring Boot does not load `.env` files directly, so load the values into the
current shell before starting the backend.

PowerShell:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    [Environment]::SetEnvironmentVariable(
      $matches[1].Trim(),
      $matches[2],
      'Process'
    )
  }
}
```

macOS or Linux:

```bash
set -a
. ./.env
set +a
```

## Run the backend

Make sure MongoDB is running and the backend environment variables are loaded.

Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

macOS or Linux:

```bash
cd backend
./mvnw spring-boot:run
```

The backend is available at `http://localhost:8080`.

Run the backend verification suite with:

```powershell
cd backend
.\mvnw.cmd clean verify
```

On macOS or Linux, use `./mvnw clean verify`.

## Run the frontend

```bash
cd frontend
npm ci
npm start
```

The frontend is available at `http://localhost:4200`.

Build and test the client with:

```bash
npm run build
npm test -- --watch=false
```

## REST API

All REST endpoints use the `/api/v1` prefix.

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Check API health | Public |
| `POST` | `/api/v1/auth/register` | Create an account | Public |
| `POST` | `/api/v1/auth/login` | Start a session | Public |
| `GET` | `/api/v1/users/me` | Get the current user | JWT |
| `GET` | `/api/v1/users` | List other users | JWT |
| `GET` | `/api/v1/messages/{otherUserId}` | Get conversation history | JWT |

## WebSocket/STOMP

| Type | Destination | Purpose |
| --- | --- | --- |
| WebSocket endpoint | `/ws` | Establish the STOMP connection |
| Client to server | `/app/chat.send` | Send a message |
| Server to user | `/user/queue/messages` | Receive messages and confirmations |
| Server to user | `/user/queue/errors` | Receive messaging errors |
| Server broadcast | `/topic/presence` | Receive presence updates |

The JWT is sent in the STOMP `CONNECT` headers. The server derives the sender
identity and message timestamp from the authenticated connection.

## Manual test

1. Start MongoDB, the backend, and the frontend.
2. Register one user in a normal browser window.
3. Register another user in a private window.
4. Verify that both users appear online.
5. Select each user and exchange messages.
6. Refresh a window and verify that the conversation history is restored.
7. Close one window and verify that the user appears offline.

## Technical choices

- JWT provides stateless authentication for REST and STOMP.
- MongoDB stores users and messages.
- WebSocket/STOMP provides real-time communication.
- DTOs and MapStruct keep transport models separate from stored documents.
- Lombok reduces backend boilerplate.
- Angular standalone components keep the frontend modular.

## Known limitations

- Messaging is one-to-one only.
- Conversation history is limited to the latest 200 messages.
- Attachments and group conversations are not supported.
- Delivery and read-receipt workflows are not implemented.
- The in-memory STOMP broker supports a single backend instance.
