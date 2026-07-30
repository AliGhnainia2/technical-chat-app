# Technical Chat

Technical Chat is a full-stack technical assessment for secure, one-to-one,
real-time messaging. It combines a Spring Boot API and STOMP server with an Angular
client, persists users and messages in MongoDB, and uses stateless JWT
authentication.

## Implemented features

- Account registration and login
- Stateless authentication with signed JWT access tokens
- Protected routes and authenticated REST requests
- User directory with online and offline presence
- Persisted one-to-one conversation history
- Real-time messages and presence updates over native WebSocket/STOMP
- Structured REST and STOMP errors
- Strict backend request validation and frontend form validation
- Responsive chat layout with an independently scrollable message history
- Lightweight, keyboard-accessible emoji picker that inserts emojis into message
  content

## Technical stack

### Backend

- Java 21
- Spring Boot 3.5
- Maven Wrapper
- Spring Web and Bean Validation
- Spring Security
- Spring Data MongoDB
- WebSocket/STOMP
- JJWT
- Lombok
- MapStruct
- JUnit, Mockito, MockMvc, and Spring Security Test

### Frontend

- Angular 22 standalone application
- TypeScript strict mode
- Angular Router, HttpClient, Reactive Forms, and signals
- RxJS
- `@stomp/stompjs`
- SCSS
- Vitest

## Architecture overview

The backend follows global technical layers under
`com.asatech.technicalchat`. Controllers expose DTOs rather than MongoDB
documents, services own application logic, repositories isolate persistence, and
centralized handlers produce structured errors.

```text
controller/
service/
service/impl/
repository/
model/
dto/request/
dto/response/
mapper/
config/
security/
websocket/
exception/
```

The frontend separates infrastructure from routed features:

```text
src/app/
|-- core/       Guards, interceptors, contracts, REST services, socket, and state
|-- features/   Authentication, dashboard, and not-found pages
|-- layouts/    Public and authenticated application shells
`-- shared/     Reusable form, alert, loading, and validation components
```

## Repository structure

```text
technical-chat/
|-- backend/    Spring Boot API and STOMP server
|-- frontend/   Angular client
|-- .gitignore
`-- README.md
```

The only environment template is `backend/.env.example`, because runtime
environment variables are consumed by the backend.

## Prerequisites

- JDK 21
- MongoDB Community Server, or access to a compatible MongoDB deployment
- Node.js 24.18 or another version supported by Angular 22
- npm 11 or a compatible npm version

Maven does not need to be installed globally. `JAVA_HOME` must point to a JDK 21
installation. The Maven Enforcer rule rejects every other Java major version.

## Environment setup

The real `backend/.env` file is deliberately not supplied or tracked for security
reasons. Create it from the template and keep it local.

On Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cd backend
cp .env.example .env
```

Replace the sample `JWT_SECRET` in `.env` with a standard Base64-encoded key of at
least 256 bits. Generate a 32-byte key locally in PowerShell with:

```powershell
[Convert]::ToBase64String(
  [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)
```

Alternatively, on macOS or Linux:

```bash
openssl rand -base64 32
```

Never copy the generated value into the template, documentation, source code,
tests, or logs.

| Variable | Template value | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/technical_chat` | MongoDB connection URI |
| `JWT_SECRET` | replace locally | Standard Base64 JWT signing key of at least 256 bits |
| `JWT_EXPIRATION_MS` | `86400000` | Access-token lifetime in milliseconds |
| `FRONTEND_URL` | `http://localhost:4200` | Allowed HTTP and WebSocket origin |
| `SERVER_PORT` | `8080` | Backend HTTP and WebSocket port |

Spring Boot does not load `.env` directly. Load the local variables into the
current PowerShell process before launching:

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

On macOS or Linux:

```bash
set -a
. ./.env
set +a
```

The backend refuses to start when `JWT_SECRET` is absent, invalid Base64, or
shorter than 256 bits.

## Run and test the backend

Start MongoDB Community Server first. From a shell in which the backend environment
variables have been loaded:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On macOS or Linux:

```bash
cd backend
./mvnw spring-boot:run
```

The backend runs at `http://localhost:8080`. Run the complete backend verification
with:

```powershell
cd backend
.\mvnw.cmd clean verify
```

or:

```bash
cd backend
./mvnw clean verify
```

## Run and test the frontend

Browser-visible API locations are defined in `frontend/src/environments/` and
default to:

```text
http://localhost:8080/api/v1
ws://localhost:8080/ws
```

These are service locations, not secrets. Install exactly the locked dependencies
and start the client:

```bash
cd frontend
npm ci
npm start
```

The development server runs at `http://localhost:4200`. Build and test the client
with:

```bash
npm run build
npm test -- --watch=false
```

## REST endpoints

All REST endpoints use the `/api/v1` prefix.

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | Return API health status |
| `POST` | `/api/v1/auth/register` | Public | Create an account and return a session |
| `POST` | `/api/v1/auth/login` | Public | Authenticate and return a session |
| `GET` | `/api/v1/users/me` | Bearer token | Return the current user |
| `GET` | `/api/v1/users` | Bearer token | Return other users and their presence |
| `GET` | `/api/v1/messages/{otherUserId}` | Bearer token | Return one-to-one history |

REST errors use the centralized `ApiError` contract. Unknown JSON properties are
rejected.

## STOMP destinations

The native WebSocket handshake endpoint is `/ws`.

| Direction | Destination | Purpose |
| --- | --- | --- |
| Client to server | `/app/chat.send` | Send a message request |
| Server to user | `/user/queue/messages` | Deliver messages and sender confirmations |
| Server to user | `/user/queue/errors` | Deliver structured messaging errors |
| Server to subscribers | `/topic/presence` | Broadcast presence changes |

## Authentication flow

Registration and login return an access token and a user response DTO. The browser
stores the token through `SessionService`, attaches it to protected REST requests,
and sends `Authorization: Bearer <token>` in the STOMP `CONNECT` headers. The server
validates the signature and expiration, reloads the user for WebSocket connections,
and derives sender identity and timestamps from the authenticated server context.
Logout and HTTP 401 handling disconnect STOMP and clear session and chat state.

The `/ws` HTTP handshake is public because authentication occurs during STOMP
`CONNECT`; invalid, expired, or absent credentials are refused at that stage.

## MongoDB collections

The default connection URI is:

```text
mongodb://localhost:27017/technical_chat
```

The database contains:

- `users`: username, email, BCrypt password hash, status, presence timestamps, and
  account timestamps. Username and email have unique indexes.
- `messages`: sender ID, recipient ID, trimmed content, server timestamp, and
  delivery status. Conversation history uses directional and compound indexes.

Password hashes remain server-side and are never exposed by REST or STOMP DTOs.
The history endpoint returns the latest 200 messages in chronological order.

## Manual two-user test scenario

1. Start MongoDB, the backend, and the frontend.
2. Register user A in a normal browser window.
3. Register user B in a private browser window.
4. Confirm that each user sees the other as online.
5. Select the other user in both windows.
6. Send a message from A and confirm immediate receipt by B.
7. Reply from B and confirm immediate receipt by A.
8. Refresh either window and confirm that both messages are restored in order.
9. Close one window and confirm that the contact becomes offline with an updated
   last-seen time.
10. Log out and confirm that protected routes return to the login page.

## Technical choices and justifications

- JWT authentication is stateless, keeping REST and STOMP identity consistent
  without server-side HTTP sessions.
- A standard Base64 secret of at least 256 bits is required so HMAC signing cannot
  silently fall back to a weak key.
- DTO boundaries prevent persistence fields such as password hashes from becoming
  transport contracts.
- MongoDB stores chat documents naturally, while compound indexes support bounded
  two-way history queries.
- The in-memory STOMP broker keeps this assessment focused; authenticated
  user-specific queues avoid broadcasting private message content.
- Angular standalone components and signals keep client state explicit without an
  additional state-management dependency.
- The emoji picker is local and dependency-free because emojis remain ordinary
  message content.

## Known limitations

- Messaging is one-to-one only.
- Conversation history is limited to the latest 200 messages and has no cursor
  pagination.
- Status is initialized to `SENT`; delivery and read-receipt transitions are not
  implemented.
- Groups, attachments, message editing or deletion, reactions, browser
  notifications, and audio or video calls are not implemented.
- The in-memory STOMP broker and in-process presence counter target one backend
  instance.
- Docker configuration is intentionally excluded.
