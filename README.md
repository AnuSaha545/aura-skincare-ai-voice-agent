# Aura Skincare AI Voice Agent

A browser-based customer support agent built with React, Vite, Express, and Groq. Aria answers Aura Skincare policy questions, looks up the included demonstration orders, supports voice or typed interaction, and generates a structured call summary.

## Features

- Browser speech recognition and speech synthesis with typed-query fallback.
- Groq chat responses using `openai/gpt-oss-20b`.
- Verified order details retrieved from the existing `get_order_details(order_id)` service.
- Contextual order references, including `ORD-101`, `order 101`, and follow-ups such as “when will it arrive?”
- Concise transcript and structured call summary.
- Policy guidance without claiming to execute unsupported cancellations, refunds, or replacements.

## Requirements

- Node.js 20 or newer and npm.
- A Groq API key.
- A supported browser with microphone access for voice interaction. Typed questions work without speech recognition.

## Local setup

Install dependencies in each application:

```powershell
cd backend
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Set `GROQ_API_KEY` in `backend/.env`. Configure the other values if needed:

```dotenv
GROQ_API_KEY=your_groq_api_key
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

Start the backend:

```powershell
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

The frontend defaults to `http://localhost:5000` when `VITE_API_URL` is not set. The provided frontend `.env` example sets that URL explicitly. Open the Vite URL (normally `http://localhost:5173`) and allow microphone access to use voice.

## Environment variables

| Variable | Application | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Backend | Secret Groq API credential. Never put it in a `VITE_*` variable. |
| `PORT` | Backend | HTTP port supplied by Render; defaults to `5000` locally. |
| `CORS_ORIGIN` | Backend | Comma-separated allowed frontend origins. Defaults to `http://localhost:5173`. |
| `VITE_API_URL` | Frontend | Backend origin, for example `https://aura-api.example.com`; `/api/ai` is appended by the app. |

Environment files are ignored by Git; commit only the `.env.example` templates.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Backend health message |
| `GET` | `/api/orders/:orderId` | Retrieve a demonstration order |
| `POST` | `/api/ai/chat` | Generate an answer from `{ "message": "...", "history": [] }` |
| `POST` | `/api/ai/summary` | Generate the four-field structured summary from a transcript |

Order records are local demonstration data in `backend/data/orderData.js`; they are not live orders. Aria can explain that an order is eligible for cancellation but cannot perform a cancellation. Refunds and replacements likewise require a real operational backend that this project does not provide.

The call summary response contains exactly `customer_intent`, `order_id`, `resolution_status`, and `call_summary`. Intent and status values are validated against the enums in the AI service; transactional requests remain unresolved because this app cannot execute those transactions.

## Deployment

### Render backend

Create a Render Web Service using the repository and the `backend` directory as the root:

- Build command: `npm install`
- Start command: `npm start`
- Set `GROQ_API_KEY` to the secret in the Render environment settings.
- Set `CORS_ORIGIN` to the deployed frontend origin (no trailing slash); multiple origins may be comma-separated.
- Render provides `PORT`; the server listens on it automatically.

### Vercel frontend

Import the repository into Vercel and set the project root to `frontend`. Set `VITE_API_URL` to the Render backend origin, such as `https://aura-api.example.com`. Build with `npm run build` and publish `dist`. Vite embeds `VITE_*` values in the frontend, so never use this prefix for secrets.

## Checks

From the repository root:

```powershell
cd backend
npm test
node --check server.js
node --check services/aiService.js
cd ..\frontend
npm run lint
npm run build
```

Speech recognition availability and accuracy depend on the browser and its speech service. Order data and tracking details are mock data; no cancellation, refund, replacement, or courier transaction is performed.
